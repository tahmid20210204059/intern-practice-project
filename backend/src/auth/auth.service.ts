import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { getPasswordError } from '../common/validators';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async signup(name: string, email: string, password: string) {
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
    return this.buildToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    return this.buildToken(user);
  }

  private buildToken(user: any) {
    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    };
  }
}