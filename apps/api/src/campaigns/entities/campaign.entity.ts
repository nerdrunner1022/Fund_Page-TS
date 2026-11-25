import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignStatus, CampaignTranslations } from '../campaign.types';

@Entity('campaigns')
export class Campaign {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text', unique: true })
  slug: string;

  @Column({ type: 'jsonb' })
  translations: CampaignTranslations;

  @Column({ name: 'goal_minor', type: 'bigint' })
  goalMinor: string;

  @Column({ name: 'raised_minor', type: 'bigint', default: '0' })
  raisedMinor: string;

  @Column({ name: 'perch_count', type: 'int', default: 40 })
  perchCount: number;

  @Column({ type: 'timestamptz' })
  deadline: Date;

  @Column({ name: 'whatsapp_number', type: 'text' })
  whatsappNumber: string;

  @Column({ type: 'text', default: 'active' })
  status: CampaignStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
