import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignResponse } from './dto/campaign-response.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaigns: Repository<Campaign>,
  ) {}

  async findBySlug(slug: string): Promise<CampaignResponse> {
    const campaign = await this.campaigns.findOne({
      where: { slug, status: 'active' },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return {
      id: campaign.id,
      slug: campaign.slug,
      translations: campaign.translations,
      goalMinor: String(campaign.goalMinor),
      raisedMinor: String(campaign.raisedMinor),
      percent: calculatePercent(
        String(campaign.raisedMinor),
        String(campaign.goalMinor),
      ),
      perchCount: campaign.perchCount,
      deadline: campaign.deadline.toISOString(),
      whatsappNumber: campaign.whatsappNumber,
      status: campaign.status,
    };
  }
}

export function calculatePercent(raisedMinor: string, goalMinor: string): number {
  const goal = BigInt(goalMinor);
  if (goal <= 0n) return 0;
  const ratio = Number((BigInt(raisedMinor) * 10000n) / goal) / 100;
  return Math.min(Math.max(ratio, 0), 100);
}
