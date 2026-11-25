import { Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export const TOTALS_CONNECTION = 'TOTALS_CONNECTION';

/** Optional second pool for the public totals query. */
@Injectable()
export class TotalsConnection implements OnApplicationShutdown {
  constructor(readonly dataSource: DataSource | null) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: TOTALS_CONNECTION,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<TotalsConnection> => {
        // Automated tests use pg-mem through the primary datasource.
        if (config.get<boolean>('USE_MEMORY_DB')) {
          return new TotalsConnection(null);
        }
        const url =
          config.get<string>('READONLY_DATABASE_URL') ??
          config.getOrThrow<string>('DATABASE_URL');
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          synchronize: false,
          logging: false,
        });
        await dataSource.initialize();
        return new TotalsConnection(dataSource);
      },
    },
  ],
  exports: [TOTALS_CONNECTION],
})
export class TotalsDatabaseModule {}
