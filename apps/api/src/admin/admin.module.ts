import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonationsModule } from '../donations/donations.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUser } from './entities/admin-user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    DonationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, JwtAuthGuard],
  exports: [AdminService],
})
export class AdminModule {}
