import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { TotalsDatabaseModule } from '../database/totals.module';
import { FxModule } from '../fx/fx.module';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { Donation } from './entities/donation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, Campaign]),
    TotalsDatabaseModule,
    FxModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
