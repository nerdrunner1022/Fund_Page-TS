import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AdminUser } from '../admin/entities/admin-user.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Donation } from '../donations/entities/donation.entity';

export const ENTITIES = [Campaign, Donation, AdminUser];

// Set only by the throwaway in-memory branch below; never in production.
let memoryDb: any;

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<DataSourceOptions> => {
        // Throwaway in-memory Postgres for automated tests; production always
        // connects to the real DATABASE_URL and uses checked-in migrations.
        if (config.get<boolean>('USE_MEMORY_DB')) {
          const { DataType, newDb } = await import('pg-mem');
          memoryDb = newDb({ autoCreateForeignKeyIndices: true });
          for (const name of ['version', 'current_database', 'current_schema']) {
            memoryDb.public.registerFunction({
              name,
              returns: DataType.text,
              implementation: () =>
                name === 'version'
                  ? 'PostgreSQL 16.0'
                  : name === 'current_database'
                    ? 'fund_test'
                    : 'public',
            });
          }
          return {
            type: 'postgres',
            entities: ENTITIES,
            synchronize: true,
            logging: false,
          };
        }

        return {
          type: 'postgres',
          url: config.getOrThrow<string>('DATABASE_URL'),
          entities: ENTITIES,
          synchronize: config.get<boolean>('DB_SYNCHRONIZE') ?? false,
          migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
          migrationsRun: false,
          logging:
            config.get('NODE_ENV') === 'development'
              ? ['error', 'schema']
              : ['error'],
        };
      },
      dataSourceFactory: async (options?: DataSourceOptions): Promise<DataSource> => {
        const settings = options ?? { type: 'postgres' };
        return memoryDb
          ? memoryDb.adapters.createTypeormDataSource(settings)
          : new DataSource(settings);
      },
    }),
  ],
})
export class DatabaseModule {}
