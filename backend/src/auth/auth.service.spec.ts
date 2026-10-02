import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service.js';

const mk = () => jest.fn<(...args: any[]) => any>();
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const HOUR = 3600000;

function build(config: Record<string, string> = {}) {
  const usersService = {
    findByEmail: mk(),
    create: mk(),
    findByRefreshTokenHash: mk(),
    setRefreshToken: mk().mockResolvedValue(undefined),
    clearRefreshToken: mk().mockResolvedValue(undefined),
  };
  const jwtService = new JwtService({ secret: 'unit-test-secret', signOptions: { expiresIn: 900 } });
  const configService = { get: (key: string) => config[key] } as unknown as ConfigService;
  const service = new AuthService(usersService as any, jwtService, configService);
  return { service, usersService, jwtService };
}

describe('AuthService.signup', () => {
  it('stores a bcrypt hash, forces the user role and issues a verifiable token pair', async () => {
    const { service, usersService, jwtService } = build();
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user' });

    const result = await service.signup('Ada', 'ada@example.com', 'Password1');

    const created = usersService.create.mock.calls[0][0];
    expect(created.role).toBe('user');
    expect(created.passwordHash).not.toBe('Password1');
    expect(await bcrypt.compare('Password1', created.passwordHash)).toBe(true);
    const payload: any = jwtService.verify(result.accessToken);
    expect(payload).toMatchObject({ sub: 'u1', email: 'ada@example.com', role: 'user' });
    expect(result.user).toEqual({ id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user' });
  });

  it('stores only the sha256 hash of the refresh token', async () => {
    const { service, usersService } = build();
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user' });

    const result = await service.signup('Ada', 'ada@example.com', 'Password1');

    expect(result.refreshToken).toHaveLength(80);
    expect(usersService.setRefreshToken).toHaveBeenCalledWith('u1', sha256(result.refreshToken), result.refreshTokenExpiresAt);
    expect(usersService.setRefreshToken.mock.calls[0][1]).not.toBe(result.refreshToken);
  });

  it('rejects a duplicate email without creating a user', async () => {
    const { service, usersService } = build();
    usersService.findByEmail.mockResolvedValue({ _id: 'existing' });

    await expect(service.signup('Ada', 'ada@example.com', 'Password1')).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])('rejects weak password %s', async (password) => {
    const { service, usersService } = build();
    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.signup('Ada', 'ada@example.com', password)).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('uses the configured refresh lifetime and falls back to 7 days', async () => {
    const configured = build({ REFRESH_TOKEN_EXPIRES_IN_DAYS: '2' });
    configured.usersService.findByEmail.mockResolvedValue(null);
    configured.usersService.create.mockResolvedValue({ _id: 'u1', name: 'A', email: 'a@b.com', role: 'user' });
    const before = Date.now();
    const two = await configured.service.signup('A', 'a@b.com', 'Password1');
    expect(two.refreshTokenExpiresAt.getTime() - before).toBeGreaterThanOrEqual(2 * 24 * HOUR);
    expect(two.refreshTokenExpiresAt.getTime() - before).toBeLessThan(2 * 24 * HOUR + 5000);

    const fallback = build();
    fallback.usersService.findByEmail.mockResolvedValue(null);
    fallback.usersService.create.mockResolvedValue({ _id: 'u1', name: 'A', email: 'a@b.com', role: 'user' });
    const start = Date.now();
    const seven = await fallback.service.signup('A', 'a@b.com', 'Password1');
    expect(seven.refreshTokenExpiresAt.getTime() - start).toBeGreaterThanOrEqual(7 * 24 * HOUR);
    expect(seven.refreshTokenExpiresAt.getTime() - start).toBeLessThan(7 * 24 * HOUR + 5000);
  });
});

describe('AuthService.login', () => {
  it('returns a token pair for correct credentials', async () => {
    const { service, usersService, jwtService } = build();
    const passwordHash = await bcrypt.hash('Password1', 4);
    usersService.findByEmail.mockResolvedValue({ _id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'admin', passwordHash });

    const result = await service.login('ada@example.com', 'Password1');

    expect((jwtService.verify(result.accessToken) as any).role).toBe('admin');
    expect(result.user.id).toBe('u1');
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    const { service, usersService } = build();
    const passwordHash = await bcrypt.hash('Password1', 4);
    usersService.findByEmail.mockResolvedValueOnce({ _id: 'u1', email: 'a@b.com', role: 'user', passwordHash });
    await expect(service.login('a@b.com', 'WrongPass1')).rejects.toThrow('Invalid credentials');

    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(service.login('nobody@b.com', 'Password1')).rejects.toThrow('Invalid credentials');
    expect(usersService.setRefreshToken).not.toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  it('rejects a missing token', async () => {
    const { service } = build();
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown token after hashing it for lookup', async () => {
    const { service, usersService } = build();
    usersService.findByRefreshTokenHash.mockResolvedValue(null);

    await expect(service.refresh('raw-token')).rejects.toThrow('Invalid refresh token');
    expect(usersService.findByRefreshTokenHash).toHaveBeenCalledWith(sha256('raw-token'));
  });

  it.each([new Date(Date.now() - HOUR), null])('rejects and clears an expired token (%s)', async (expiresAt) => {
    const { service, usersService } = build();
    usersService.findByRefreshTokenHash.mockResolvedValue({ _id: 'u1', refreshTokenExpiresAt: expiresAt });

    await expect(service.refresh('raw-token')).rejects.toThrow('Refresh token expired');
    expect(usersService.clearRefreshToken).toHaveBeenCalledWith('u1');
    expect(usersService.setRefreshToken).not.toHaveBeenCalled();
  });

  it('rotates the refresh token on success', async () => {
    const { service, usersService } = build();
    usersService.findByRefreshTokenHash.mockResolvedValue({
      _id: 'u1', name: 'Ada', email: 'a@b.com', role: 'user', refreshTokenExpiresAt: new Date(Date.now() + HOUR),
    });

    const result = await service.refresh('old-raw-token');

    expect(result.refreshToken).not.toBe('old-raw-token');
    expect(usersService.setRefreshToken).toHaveBeenCalledWith('u1', sha256(result.refreshToken), result.refreshTokenExpiresAt);
  });
});

describe('AuthService.logout', () => {
  it('does nothing without a token or for an unknown token', async () => {
    const { service, usersService } = build();
    await service.logout(undefined);
    usersService.findByRefreshTokenHash.mockResolvedValue(null);
    await service.logout('unknown');
    expect(usersService.clearRefreshToken).not.toHaveBeenCalled();
  });

  it('clears the stored refresh token for a valid session', async () => {
    const { service, usersService } = build();
    usersService.findByRefreshTokenHash.mockResolvedValue({ _id: 'u1' });
    await service.logout('raw-token');
    expect(usersService.clearRefreshToken).toHaveBeenCalledWith('u1');
  });
});
