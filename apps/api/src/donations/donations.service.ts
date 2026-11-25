import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import {
  DataSource,
  MoreThan,
  Repository,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { parseAmountToMinor } from '../common/money';
import { generateReferenceCode } from '../common/reference-code';
import { Campaign } from '../campaigns/entities/campaign.entity';
import {
  TOTALS_CONNECTION,
  TotalsConnection,
} from '../database/totals.module';
import type { AdminCreateDonationDto } from '../admin/dto/create-admin-donation.dto';
import type { AdminUpdateDonationDto } from '../admin/dto/update-admin-donation.dto';
import {
  AdminDonationResponse,
  CampaignTotalsResponse,
  ConfirmedDonationResponse,
  CreateDonationDto,
  DonationCursorPage,
  PendingDonationResponse,
} from './dto/create-donation.dto';
import { Donation, DonationStatus } from './entities/donation.entity';

const MAX_PAGE_SIZE = 50;
const UNIQUE_VIOLATION = '23505';
const TOTALS_CACHE_MS = 30_000;

@Injectable()
export class DonationsService {
  private readonly totalsCache = new Map<
    string,
    { at: number; value: CampaignTotalsResponse }
  >();

  constructor(
    @InjectRepository(Donation)
    private readonly donations: Repository<Donation>,
    @InjectRepository(Campaign)
    private readonly campaigns: Repository<Campaign>,
    private readonly dataSource: DataSource,
    @Inject(TOTALS_CONNECTION)
    private readonly totalsConnection: TotalsConnection,
  ) {}

  async create(
    campaignSlug: string,
    dto: CreateDonationDto,
  ): Promise<PendingDonationResponse> {
    const campaign = await this.findActiveCampaign(campaignSlug);
    const amountMinor = parseAmountToMinor(dto.amount);

    // A declaration never changes the campaign total: an admin verifies the
    // bank slip and calls confirm() before any money is counted.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const donation = this.donations.create({
        id: randomUUID(),
        campaignId: campaign.id,
        referenceCode: generateReferenceCode(),
        donorName: dto.donorName ?? null,
        amountMinor: amountMinor.toString(),
        message: dto.message ?? null,
        status: 'pending',
        confirmedAt: null,
      });

      try {
        const saved = await this.donations.save(donation);
        return {
          id: saved.id,
          referenceCode: saved.referenceCode,
          amountMinor: String(saved.amountMinor),
          donorName: saved.donorName,
          status: 'pending',
          createdAt: saved.createdAt.toISOString(),
        };
      } catch (error: unknown) {
        if (attempt < 2 && isUniqueViolation(error)) continue;
        throw error;
      }
    }

    throw new ConflictException('Could not create a donation reference.');
  }

  /** Adds a donation already seen on the bank statement or a WhatsApp slip. */
  async createVerified(
    campaignSlug: string,
    dto: AdminCreateDonationDto,
    adminEmail: string,
  ): Promise<AdminDonationResponse> {
    const campaign = await this.findActiveCampaign(campaignSlug);
    const amountMinor = parseAmountToMinor(dto.amount);

    if (dto.bankRef) {
      const duplicate = await this.donations.findOne({
        where: { bankRef: dto.bankRef },
      });
      if (duplicate) {
        throw new ConflictException('Bank reference has already been recorded.');
      }
    }

    const donation = this.donations.create({
      id: randomUUID(),
      campaignId: campaign.id,
      referenceCode: generateReferenceCode(),
      donorName: dto.donorName ?? null,
      amountMinor: amountMinor.toString(),
      bankRef: dto.bankRef ?? null,
      slipUrl: dto.slipUrl ?? null,
      donatedOn: dto.donatedOn ?? null,
      message: null,
      status: 'confirmed',
      confirmedAt: new Date(),
      verifiedBy: adminEmail,
    });

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const row = await manager.save(Donation, donation);
        await manager.increment(
          Campaign,
          { id: campaign.id },
          'raisedMinor',
          amountMinor.toString(),
        );
        return row;
      });
      this.totalsCache.clear();
      return toAdminResponse(saved);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Bank reference has already been recorded.');
      }
      throw error;
    }
  }

  async confirm(
    id: string,
    adminEmail: string,
  ): Promise<{ id: string; status: 'confirmed'; raisedMinor: string }> {
    const result = await this.dataSource.transaction(async (manager) => {
      const donation = await manager.findOne(Donation, { where: { id } });
      if (!donation) {
        throw new NotFoundException('Donation not found.');
      }
      if (donation.status !== 'pending') {
        throw new ConflictException(
          `Donation is already ${donation.status}; it cannot be verified again.`,
        );
      }

      const update = await manager.update(
        Donation,
        { id, status: 'pending' },
        {
          status: 'confirmed',
          confirmedAt: new Date(),
          verifiedBy: adminEmail,
        },
      );
      if (update.affected !== 1) {
        throw new ConflictException('Donation was changed concurrently.');
      }

      await manager.increment(
        Campaign,
        { id: donation.campaignId },
        'raisedMinor',
        donation.amountMinor,
      );

      const campaign = await manager.findOne(Campaign, {
        where: { id: donation.campaignId },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found.');
      }

      return {
        id: donation.id,
        status: 'confirmed' as const,
        raisedMinor: String(campaign.raisedMinor),
      };
    });
    this.totalsCache.clear();
    return result;
  }

  async decline(
    id: string,
    adminEmail: string,
  ): Promise<{ id: string; status: 'declined' }> {
    const update = await this.donations.update(
      { id, status: 'pending' },
      { status: 'declined', verifiedBy: adminEmail },
    );
    if (update.affected !== 1) {
      const exists = await this.donations.exists({ where: { id } });
      if (!exists) {
        throw new NotFoundException('Donation not found.');
      }
      throw new ConflictException('Only a pending donation can be rejected.');
    }
    return { id, status: 'declined' };
  }

  /** Edits a donation in place; any change to the counted value is applied to
   * the campaign total in the same transaction. */
  async update(
    id: string,
    dto: AdminUpdateDonationDto,
    adminEmail: string,
  ): Promise<AdminDonationResponse> {
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const donation = await manager.findOne(Donation, { where: { id } });
        if (!donation) {
          throw new NotFoundException('Donation not found.');
        }

        if (dto.bankRef && dto.bankRef !== donation.bankRef) {
          const duplicate = await manager.findOne(Donation, {
            where: { bankRef: dto.bankRef },
          });
          if (duplicate && duplicate.id !== id) {
            throw new ConflictException('Bank reference has already been recorded.');
          }
        }

        const oldAmount = BigInt(donation.amountMinor);
        const newAmount =
          dto.amount === undefined ? oldAmount : parseAmountToMinor(dto.amount);
        const oldStatus = donation.status;
        const newStatus = dto.status ?? oldStatus;
        const wasCounted = oldStatus === 'confirmed';
        const isCounted = newStatus === 'confirmed';
        const delta = (isCounted ? newAmount : 0n) - (wasCounted ? oldAmount : 0n);

        const patch: Partial<Donation> = {
          amountMinor: newAmount.toString(),
          status: newStatus,
          donorName:
            dto.donorName === undefined
              ? donation.donorName
              : dto.donorName || null,
          bankRef: dto.bankRef === undefined ? donation.bankRef : dto.bankRef || null,
          slipUrl:
            dto.slipUrl === undefined ? donation.slipUrl : dto.slipUrl || null,
          donatedOn:
            dto.donatedOn === undefined ? donation.donatedOn : dto.donatedOn || null,
          message: dto.message === undefined ? donation.message : dto.message || null,
          verifiedBy: adminEmail,
          confirmedAt: isCounted
            ? (donation.confirmedAt ?? new Date())
            : null,
        };

        // Compare the old values too, so two concurrent edits cannot both
        // succeed with stale totals.
        const result = await manager.update(
          Donation,
          { id, status: oldStatus, amountMinor: donation.amountMinor },
          patch,
        );
        if (result.affected !== 1) {
          throw new ConflictException('Donation was changed concurrently.');
        }

        if (delta !== 0n) {
          await adjustCampaignTotal(manager, donation.campaignId, delta);
        }

        const updated = await manager.findOne(Donation, { where: { id } });
        if (!updated) {
          throw new NotFoundException('Donation not found.');
        }
        return toAdminResponse(updated);
      });
      this.totalsCache.clear();
      return saved;
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Bank reference has already been recorded.');
      }
      throw error;
    }
  }

  /** Removes a donation and reverses its contribution to the campaign total. */
  async remove(id: string): Promise<{ id: string; status: DonationStatus }> {
    const removed = await this.dataSource.transaction(async (manager) => {
      const donation = await manager.findOne(Donation, { where: { id } });
      if (!donation) {
        throw new NotFoundException('Donation not found.');
      }

      const result = await manager.delete(Donation, {
        id,
        status: donation.status,
        amountMinor: donation.amountMinor,
      });
      if (result.affected !== 1) {
        throw new ConflictException('Donation was changed concurrently.');
      }

      if (donation.status === 'confirmed') {
        await adjustCampaignTotal(
          manager,
          donation.campaignId,
          -BigInt(donation.amountMinor),
        );
      }
      return { id, status: donation.status };
    });
    this.totalsCache.clear();
    return removed;
  }

  async listPending(options: {
    slug?: string;
    status: DonationStatus;
    after?: string;
    limit: number;
  }): Promise<DonationCursorPage<AdminDonationResponse>> {
    const take = Math.min(options.limit, MAX_PAGE_SIZE);
    const base: FindOptionsWhere<Donation> = { status: options.status };

    if (options.slug) {
      const campaign = await this.campaigns.findOne({
        where: { slug: options.slug },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found.');
      }
      base.campaignId = campaign.id;
    }

    const rows = await this.donations.find({
      where: buildCursorWhere(base, options.after),
      order: { createdAt: 'ASC', id: 'ASC' },
      take: take + 1,
    });

    return toCursorPage(rows, take, toAdminResponse);
  }

  /** Public totals: only a summed amount and a donor count leave the server. */
  async getTotals(campaignSlug: string): Promise<CampaignTotalsResponse> {
    const cached = this.totalsCache.get(campaignSlug);
    if (cached && Date.now() - cached.at < TOTALS_CACHE_MS) {
      return cached.value;
    }

    const campaign = await this.findActiveCampaign(campaignSlug);
    let raised: string;
    let donors: number;

    const readOnly = this.totalsConnection.dataSource;
    if (readOnly) {
      const rows = (await readOnly.query(
        `SELECT COALESCE(SUM(amount_minor), 0) AS raised,
                COUNT(*)::int AS donors
         FROM donations
         WHERE campaign_id = $1 AND status = $2`,
        [campaign.id, 'confirmed'],
      )) as Array<{ raised: string | number; donors: number }>;
      raised = String(rows[0]?.raised ?? '0');
      donors = Number(rows[0]?.donors ?? 0);
    } else {
      // pg-mem test branch: same query through the primary repository.
      const row = await this.donations
        .createQueryBuilder('d')
        .select('COALESCE(SUM(d.amount_minor), 0)', 'raised')
        .addSelect('COUNT(*)', 'donors')
        .where('d.campaignId = :campaignId', { campaignId: campaign.id })
        .andWhere('d.status = :status', { status: 'confirmed' })
        .getRawOne<{ raised: string | number; donors: number }>();
      raised = String(row?.raised ?? '0');
      donors = Number(row?.donors ?? 0);
    }

    const value: CampaignTotalsResponse = { raised, donors };
    this.totalsCache.set(campaignSlug, { at: Date.now(), value });
    return value;
  }

  async listConfirmed(
    campaignSlug: string,
    options: { after?: string; limit: number },
  ): Promise<DonationCursorPage<ConfirmedDonationResponse>> {
    const campaign = await this.findActiveCampaign(campaignSlug);
    const take = Math.min(options.limit, MAX_PAGE_SIZE);
    const rows = await this.donations.find({
      where: buildCursorWhere(
        { campaignId: campaign.id, status: 'confirmed' },
        options.after,
      ),
      order: { createdAt: 'ASC', id: 'ASC' },
      take: take + 1,
    });

    return toCursorPage(rows, take, (row) => ({
      id: row.id,
      amountMinor: String(row.amountMinor),
      confirmedAt: row.confirmedAt?.toISOString() ?? row.createdAt.toISOString(),
    }));
  }

  private async findActiveCampaign(slug: string): Promise<Campaign> {
    const campaign = await this.campaigns.findOne({
      where: { slug, status: 'active' },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }
    return campaign;
  }
}

/** Applies a signed minor-unit delta to the cached campaign total. */
async function adjustCampaignTotal(
  manager: EntityManager,
  campaignId: string,
  delta: bigint,
): Promise<void> {
  const campaign = await manager.findOne(Campaign, { where: { id: campaignId } });
  if (!campaign) {
    throw new NotFoundException('Campaign not found.');
  }
  const raised = BigInt(campaign.raisedMinor) + delta;
  if (raised < 0n) {
    throw new ConflictException('Campaign total cannot be negative.');
  }
  await manager.update(
    Campaign,
    { id: campaignId },
    { raisedMinor: raised.toString() },
  );
}

function toAdminResponse(row: Donation): AdminDonationResponse {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    donorName: row.donorName,
    amountMinor: String(row.amountMinor),
    bankRef: row.bankRef,
    slipUrl: row.slipUrl,
    donatedOn: toDateString(row.donatedOn),
    message: row.message,
    status: row.status,
    verifiedBy: row.verifiedBy,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
  };
}

/** Postgres returns DATE columns as strings; pg-mem may return a Date. */
function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION
  );
}

interface Cursor {
  at: Date;
  id: string;
}

/** A stable keyset cursor: creation time plus UUID tie-breaker. */
function parseCursor(value?: string): Cursor | undefined {
  if (!value) return undefined;
  const separator = value.indexOf('|');
  if (separator < 0) {
    throw new BadRequestException('Invalid pagination cursor.');
  }
  const at = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);
  if (Number.isNaN(at.getTime()) || !id) {
    throw new BadRequestException('Invalid pagination cursor.');
  }
  return { at, id };
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}|${row.id}`;
}

function buildCursorWhere(
  base: FindOptionsWhere<Donation>,
  after?: string,
): FindOptionsWhere<Donation>[] {
  const cursor = parseCursor(after);
  if (!cursor) return [base];
  return [
    { ...base, createdAt: MoreThan(cursor.at) },
    { ...base, createdAt: cursor.at, id: MoreThan(cursor.id) },
  ];
}

function toCursorPage<T extends { id: string; createdAt: Date }, R>(
  rows: T[],
  take: number,
  map: (row: T) => R,
): DonationCursorPage<R> {
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(map),
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}
