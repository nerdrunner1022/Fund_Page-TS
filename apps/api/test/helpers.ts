import { INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AdminUser } from '../src/admin/entities/admin-user.entity';
import {
  CAMPAIGN_SLUG,
  CAMPAIGN_TRANSLATIONS,
  DEADLINE,
  GOAL_MINOR,
  PERCH_COUNT,
  WHATSAPP_NUMBER,
} from '../src/campaigns/campaign.seed';
import { Campaign } from '../src/campaigns/entities/campaign.entity';
import { ENTITIES } from '../src/database/database.module';

export async function createTestApp(): Promise<INestApplication> {
  // A fresh throwaway Postgres-compatible database per test file.
  const { DataType, newDb } = await import('pg-mem');
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 16.0',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'fund_test',
  });
  db.public.registerFunction({
    name: 'current_schema',
    returns: DataType.text,
    implementation: () => 'public',
  });
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: ENTITIES,
    synchronize: true,
    logging: false,
  } as any);
  await dataSource.initialize();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(getDataSourceToken())
    .useValue(dataSource)
    .overrideProvider(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

export async function seedTestData(app: INestApplication): Promise<Campaign> {
  const campaigns = app.get<Repository<Campaign>>(
    getRepositoryToken(Campaign),
  );
  const admins = app.get<Repository<AdminUser>>(getRepositoryToken(AdminUser));

  const campaign = campaigns.create({
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

  const admin = admins.create({
    id: randomUUID(),
    email: process.env.ADMIN_EMAIL as string,
    passwordHash: await hash(process.env.ADMIN_PASSWORD as string, 4),
  });
  await admins.save(admin);

  return campaign;
}
