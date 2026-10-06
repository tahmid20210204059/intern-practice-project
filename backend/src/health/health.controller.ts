import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse, ApiOperation, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

const DB_PING_TIMEOUT_MS = 2000;

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  private isConnected() {
    return this.connection.readyState === 1;
  }

  private async pingDatabase(): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      const db = this.connection.db;
      if (!db) return false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Database ping timed out')), DB_PING_TIMEOUT_MS);
      });
      try {
        await Promise.race([db.command({ ping: 1 }), timeout]);
      } finally {
        clearTimeout(timer);
      }
      return true;
    } catch {
      return false;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Basic status', description: 'Always responds 200 while the process is up. Reports the database connection state.' })
  @ApiOkResponse({ schema: { example: { success: true, data: { status: 'ok', database: 'connected', uptime: 12.4, timestamp: '2026-01-01T00:00:00.000Z' } } } })
  check() {
    return {
      status: 'ok',
      database: this.isConnected() ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime() * 10) / 10,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe', description: 'Responds 200 while the process can serve requests. Does not touch the database.' })
  @ApiOkResponse({ schema: { example: { success: true, data: { status: 'ok' } } } })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe', description: 'Pings MongoDB. Responds 503 when the database is unreachable. Used by the Docker health check.' })
  @ApiOkResponse({ schema: { example: { success: true, data: { status: 'ok', database: 'connected' } } } })
  @ApiServiceUnavailableResponse({ schema: { example: { success: false, statusCode: 503, message: 'Database unavailable', errors: [] } } })
  async ready() {
    if (!(await this.pingDatabase())) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', database: 'connected' };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { success: true, data: { message: 'You are an admin' } } } })
  @ApiUnauthorizedResponse({ schema: { example: { success: false, statusCode: 401, message: 'Unauthorized', errors: [] } } })
  @ApiForbiddenResponse({ schema: { example: { success: false, statusCode: 403, message: 'Forbidden resource', errors: [] } } })
  adminCheck() {
    return { message: 'You are an admin' };
  }
}