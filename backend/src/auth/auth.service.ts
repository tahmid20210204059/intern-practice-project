import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { getPasswordError } from '../common/validators.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: { id: any; name: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(name: string, email: string, password: string): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordError = getPasswordError(password);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      name, email, passwordHash,
      role: 'user',
    } as any);
    return this.issueTokenPair(user);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokenPair(user);
  }

  async refresh(rawToken: string | undefined): Promise<TokenPair> {
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');
    const hash = this.hashToken(rawToken);
    const user = await this.usersService.findByRefreshTokenHash(hash);
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearRefreshToken(user._id.toString());
      throw new UnauthorizedException('Refresh token expired');
    }
    return this.issueTokenPair(user);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = this.hashToken(rawToken);
    const user = await this.usersService.findByRefreshTokenHash(hash);
    if (!user) return;
    await this.usersService.clearRefreshToken(user._id.toString());
  }

  private async issueTokenPair(user: any): Promise<TokenPair> {
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const hash = this.hashToken(rawRefreshToken);
    const refreshDays = Number(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS')) || 7;
    const refreshTokenExpiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.usersService.setRefreshToken(user._id.toString(), hash, refreshTokenExpiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}