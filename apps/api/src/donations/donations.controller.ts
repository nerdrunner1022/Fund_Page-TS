import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createDonationSchema,
  CreateDonationDto,
} from './dto/create-donation.dto';
import { DonationsService } from './donations.service';

const slugSchema = z.string().min(1).max(100);
const cursorSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\|[0-9a-f-]{36}$/i)
  .optional();
const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

@Controller('campaigns/:campaignSlug/donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(
    @Param('campaignSlug', new ZodValidationPipe(slugSchema))
    campaignSlug: string,
    @Body(new ZodValidationPipe(createDonationSchema)) body: CreateDonationDto,
  ) {
    return this.donations.create(campaignSlug, body);
  }

  // Public, cacheable and deliberately minimal: no names, slips or bank refs.
  @Get('totals')
  @Header('Cache-Control', 'public, max-age=30')
  totals(
    @Param('campaignSlug', new ZodValidationPipe(slugSchema))
    campaignSlug: string,
  ) {
    return this.donations.getTotals(campaignSlug);
  }

  @Get()
  list(
    @Param('campaignSlug', new ZodValidationPipe(slugSchema))
    campaignSlug: string,
    @Query('after', new ZodValidationPipe(cursorSchema))
    after: string | undefined,
    @Query('limit', new ZodValidationPipe(limitSchema)) limit: number,
  ) {
    return this.donations.listConfirmed(campaignSlug, { after, limit });
  }
}
