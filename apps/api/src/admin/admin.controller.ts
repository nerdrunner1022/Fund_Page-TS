import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DonationsService } from '../donations/donations.service';
import { AdminService } from './admin.service';
import { loginSchema, LoginDto } from './dto/admin-auth.dto';
import {
  adminCreateDonationSchema,
  AdminCreateDonationDto,
} from './dto/create-admin-donation.dto';
import {
  adminUpdateDonationSchema,
  AdminUpdateDonationDto,
} from './dto/update-admin-donation.dto';
import { AuthenticatedRequest, JwtAuthGuard } from './guards/jwt-auth.guard';

const idSchema = z.string().uuid();
const slugSchema = z.string().min(1).max(100);
const statusSchema = z
  .enum(['pending', 'confirmed', 'declined'])
  .default('pending');
const cursorSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\|[0-9a-f-]{36}$/i)
  .optional();
const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly donations: DonationsService,
  ) {}

  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto) {
    return this.admin.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('campaigns/:slug/donations')
  listDonations(
    @Param('slug', new ZodValidationPipe(slugSchema)) slug: string,
    @Query('status', new ZodValidationPipe(statusSchema))
    status: 'pending' | 'confirmed' | 'declined',
    @Query('after', new ZodValidationPipe(cursorSchema))
    after: string | undefined,
    @Query('limit', new ZodValidationPipe(limitSchema)) limit: number,
  ) {
    return this.donations.listPending({ slug, status, after, limit });
  }

  // Organisers enter a transfer already seen on the bank statement or WhatsApp.
  @UseGuards(JwtAuthGuard)
  @Post('campaigns/:slug/donations')
  @HttpCode(201)
  addDonation(
    @Param('slug', new ZodValidationPipe(slugSchema)) slug: string,
    @Body(new ZodValidationPipe(adminCreateDonationSchema))
    body: AdminCreateDonationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const email = request.user!.email;
    return this.donations.createVerified(slug, body, email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('donations/:id')
  updateDonation(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(adminUpdateDonationSchema))
    body: AdminUpdateDonationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.donations.update(id, body, request.user!.email);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('donations/:id')
  removeDonation(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.donations.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('donations/:id/confirm')
  @HttpCode(200)
  confirm(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.donations.confirm(id, request.user!.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('donations/:id/decline')
  @HttpCode(200)
  decline(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.donations.decline(id, request.user!.email);
  }
}
