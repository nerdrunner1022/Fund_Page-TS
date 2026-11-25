import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AdminUser } from '../admin/entities/admin-user.entity';
import { validateEnv } from '../config/env';
import {
  CAMPAIGN_SLUG,
  CAMPAIGN_TRANSLATIONS,
  DEADLINE,
  GOAL_MINOR,
  PERCH_COUNT,
  WHATSAPP_NUMBER,
} from '../campaigns/campaign.seed';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { ENTITIES } from './database.module';
import { hash } from 'bcryptjs';

// Scripts run from apps/api while the environment lives at the repo root.
// .env.production.local is written by `vercel env pull` and takes precedence.
loadEnv({ path: join(__dirname, '../../../../.env.production.local') });
loadEnv({ path: join(__dirname, '../../../../.env') });
loadEnv();
const env = validateEnv(process.env);

async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    // Use the direct endpoint when available (Neon), falling back to the
    // standard URL for local Postgres.
    url: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL,
    entities: ENTITIES,
  });

  await dataSource.initialize();
  try {
    const campaigns = dataSource.getRepository(Campaign);
    let campaign = await campaigns.findOne({ where: { slug: CAMPAIGN_SLUG } });

    if (!campaign) {
      campaign = campaigns.create({
        id: randomUUID(),
        slug: CAMPAIGN_SLUG,
        translations: CAMPAIGN_TRANSLATIONS,
        goalMinor: GOAL_MINOR,
        raisedMinor: '0',
        perchCount: PERCH_COUNT,
        deadline: new Date(DEADLINE),
        whatsappNumber: WHATSAPP_NUMBER,
        status: 'active',
      });
      await campaigns.save(campaign);
      console.log(`Created campaign "${CAMPAIGN_SLUG}".`);
    } else if (
      JSON.stringify(campaign.translations) !==
      JSON.stringify(CAMPAIGN_TRANSLATIONS)
    ) {
      // Refresh bilingual copy (e.g. new bank details) without touching the
      // raised total, deadline or any other organiser-managed field.
      campaign.translations = CAMPAIGN_TRANSLATIONS;
      await campaigns.save(campaign);
      console.log(`Updated copy for campaign "${CAMPAIGN_SLUG}".`);
    } else {
      console.log(`Campaign "${CAMPAIGN_SLUG}" already exists; left unchanged.`);
    }

    const admins = dataSource.getRepository(AdminUser);
    const email = env.ADMIN_EMAIL.toLowerCase();
    let admin = await admins.findOne({ where: { email } });

    if (!admin) {
      admin = admins.create({
        id: randomUUID(),
        email,
        passwordHash: await hash(env.ADMIN_PASSWORD, 12),
      });
      await admins.save(admin);
      console.log(`Created admin user "${email}".`);
    } else {
      console.log(`Admin user "${email}" already exists; left unchanged.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
