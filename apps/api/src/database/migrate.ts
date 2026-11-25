import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env';
import { ENTITIES } from './database.module';

// Scripts run from apps/api while the environment lives at the repo root.
// .env.production.local is written by `vercel env pull` and takes precedence.
loadEnv({ path: join(__dirname, '../../../../.env.production.local') });
loadEnv({ path: join(__dirname, '../../../../.env') });
loadEnv();
const env = validateEnv(process.env);

async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    // Migrations use Neon's direct endpoint: PgBouncer transaction pooling does
    // not support the session state that schema migrations rely on.
    url: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL,
    entities: ENTITIES,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: false,
  });

  await dataSource.initialize();
  try {
    const applied = await dataSource.runMigrations();
    if (applied.length === 0) {
      console.log('No pending migrations.');
    } else {
      for (const migration of applied) {
        console.log(`Applied migration: ${migration.name}`);
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
