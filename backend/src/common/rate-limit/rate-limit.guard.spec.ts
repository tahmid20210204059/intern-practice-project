import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';
import type { RateLimitOptions } from './rate-limit.decorator.js';

const mk = () => jest.fn<(...args: any[]) => any>();

function setup(options: RateLimitOptions | undefined) {
  const reflector = { getAllAndOverride: mk().mockReturnValue(options) };
  const guard = new RateLimitGuard(reflector as unknown as Reflector);
  const call = (req: Record<string, unknown>) => {
    const res = { setHeader: mk() };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
    return { run: () => guard.canActivate(context), res };
  };
  return { guard, call };
}

describe('RateLimitGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows requests when no limit is configured', () => {
    const { call } = setup(undefined);
    for (let i = 0; i < 50; i++) expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
  });

  it('blocks after the limit with 429 and a Retry-After header', () => {
    const { call } = setup({ name: 'login', limit: 2, windowMs: 60000 });
    expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
    expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
    const blocked = call({ ip: '1.1.1.1' });
    expect(() => blocked.run()).toThrow(expect.objectContaining({ status: 429 }));
    expect(blocked.res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('tracks each ip separately', () => {
    const { call } = setup({ name: 'login', limit: 1, windowMs: 60000 });
    expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
    expect(call({ ip: '2.2.2.2' }).run()).toBe(true);
    expect(() => call({ ip: '1.1.1.1' }).run()).toThrow();
  });

  it('tracks users separately when keyed by user', () => {
    const { call } = setup({ name: 'summarize', limit: 1, windowMs: 60000, by: 'user' });
    expect(call({ ip: '1.1.1.1', user: { userId: 'a' } }).run()).toBe(true);
    expect(call({ ip: '1.1.1.1', user: { userId: 'b' } }).run()).toBe(true);
    expect(() => call({ ip: '1.1.1.1', user: { userId: 'a' } }).run()).toThrow();
  });

  it('resets after the window passes', () => {
    const { call } = setup({ name: 'login', limit: 1, windowMs: 1000 });
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
    expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
    expect(() => call({ ip: '1.1.1.1' }).run()).toThrow();
    spy.mockReturnValue(now + 1500);
    expect(call({ ip: '1.1.1.1' }).run()).toBe(true);
  });
});