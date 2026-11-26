import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';

export type DonationStatus = 'pending' | 'confirmed' | 'declined';

@Entity('donations')
@Index('IDX_donations_campaign_status_created', [
  'campaignId',
  'status',
  'createdAt',
])
export class Donation {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign;

  @Column({ name: 'reference_code', type: 'text', unique: true })
  referenceCode: string;

  @Column({ name: 'donor_name', type: 'text', nullable: true })
  donorName: string | null;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor: string;

  // What the donor entered; amountMinor is always the converted LKR value.
  @Column({ type: 'text', default: 'LKR' })
  currency: string;

  @Column({ name: 'source_amount_minor', type: 'bigint', default: '0' })
  sourceAmountMinor: string;

  // LKR per one source-currency unit at the time of declaration.
  @Column({ name: 'fx_rate', type: 'text', default: '1' })
  fxRate: string;

  // Bank statement reference. Unique so the same transfer cannot be counted twice.
  @Column({ name: 'bank_ref', type: 'text', nullable: true, unique: true })
  bankRef: string | null;

  // Optional link to an uploaded slip (admin use only; never returned publicly).
  @Column({ name: 'slip_url', type: 'text', nullable: true })
  slipUrl: string | null;

  // Date on the bank statement, when the organiser enters one manually.
  @Column({ name: 'donated_on', type: 'date', nullable: true })
  donatedOn: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', default: 'pending' })
  status: DonationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  // Lightweight audit trail: which admin verified or rejected this row.
  @Column({ name: 'verified_by', type: 'text', nullable: true })
  verifiedBy: string | null;
}
