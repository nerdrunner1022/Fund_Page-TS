import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hashSync } from 'bcryptjs';
import { Repository } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { LoginResponse } from './dto/admin-auth.dto';

// Missing users are checked against a real bcrypt hash at the same cost, so
// response timing cannot be used to enumerate admin email addresses (CWE-204).
const DUMMY_PASSWORD_HASH = hashSync('timing-equalisation-placeholder', 12);

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly admins: Repository<AdminUser>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const admin = await this.admins.findOne({
      where: { email: email.toLowerCase() },
    });
    const passwordMatches = await compare(
      password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!admin || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      accessToken: await this.jwt.signAsync({
        sub: admin.id,
        email: admin.email,
      }),
    };
  }
}
