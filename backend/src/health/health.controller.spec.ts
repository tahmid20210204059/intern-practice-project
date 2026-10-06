import { jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

describe('HealthController', () => {
  let controller: HealthController;
  let connection: { readyState: number; db: { command: jest.Mock<any> } | undefined };
  let command: jest.Mock<any>;

  beforeEach(async () => {
    command = jest.fn<any>().mockResolvedValue({ ok: 1 });
    connection = { readyState: 1, db: { command } };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: 'DatabaseConnection', useValue: connection }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('reports status, database state, uptime and timestamp', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(typeof result.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('reports a disconnected database from the basic check without failing', () => {
    connection.readyState = 0;
    expect(controller.check().database).toBe('disconnected');
  });

  it('live always answers ok', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready pings the database when connected', async () => {
    await expect(controller.ready()).resolves.toEqual({ status: 'ok', database: 'connected' });
    expect(command).toHaveBeenCalledWith({ ping: 1 });
  });

  it('ready answers 503 when the connection is not open', async () => {
    connection.readyState = 0;
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(command).not.toHaveBeenCalled();
  });

  it('ready answers 503 when the ping fails', async () => {
    command.mockRejectedValue(new Error('boom'));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('ready answers 503 when the database handle is missing', async () => {
    connection.db = undefined;
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});