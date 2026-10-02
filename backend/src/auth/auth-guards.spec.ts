import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

const mk = () => jest.fn<(...args: any[]) => any>();

function context(user?: unknown) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(required: string[] | undefined) {
  const reflector = { getAllAndOverride: mk().mockReturnValue(required) };
  return { guard: new RolesGuard(reflector as unknown as Reflector), reflector };
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    expect(guardWith(undefined).guard.canActivate(context({ role: 'user' }))).toBe(true);
  });

  it('allows an admin on an admin-only route', () => {
    expect(guardWith(['admin']).guard.canActivate(context({ role: 'admin' }))).toBe(true);
  });

  it('denies a regular user on an admin-only route', () => {
    expect(guardWith(['admin']).guard.canActivate(context({ role: 'user' }))).toBe(false);
  });

  it('denies when the request has no authenticated user', () => {
    expect(guardWith(['admin']).guard.canActivate(context(undefined))).toBe(false);
  });

  it('denies a user whose role is missing', () => {
    expect(guardWith(['admin']).guard.canActivate(context({}))).toBe(false);
  });

  it('accepts any of several allowed roles', () => {
    const { guard } = guardWith(['admin', 'user']);
    expect(guard.canActivate(context({ role: 'user' }))).toBe(true);
  });

  it('reads the roles metadata from handler and class', () => {
    const { guard, reflector } = guardWith(['admin']);
    guard.canActivate(context({ role: 'admin' }));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', expect.any(Array));
  });
});

describe('JwtStrategy.validate', () => {
  it('maps the token payload to the request user', () => {
    const strategy = new JwtStrategy({ get: () => 'secret' } as unknown as ConfigService);
    expect(strategy.validate({ sub: 'u1', email: 'a@b.com', role: 'admin', iat: 1 })).toEqual({
      userId: 'u1',
      email: 'a@b.com',
      role: 'admin',
    });
  });
});
