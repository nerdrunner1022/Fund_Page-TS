import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CampaignsService } from './campaigns.service';

const slugSchema = z.string().trim().min(1).max(100);

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get(':slug')
  findOne(@Param('slug', new ZodValidationPipe(slugSchema)) slug: string) {
    return this.campaigns.findBySlug(slug);
  }
}
