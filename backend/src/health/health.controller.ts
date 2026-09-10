import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  check() {
    const dbState = this.connection.readyState;
    return {
      success: true,
      data: {
        status: 'ok',
        database: dbState === 1 ? 'connected' : 'disconnected',
      },
    };
  }
}