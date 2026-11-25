import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { validateEnv } from './config/env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DatabaseModule } from './database/database.module';
import { DonationsModule } from './donations/donations.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // npm workspaces run with apps/api as the cwd; Neon writes the root .env.
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('THROTTLE_TTL_MS'),
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    DatabaseModule,
    CampaignsModule,
    DonationsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ThrottlerGuard,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
  ],
})
export class AppModule {}
