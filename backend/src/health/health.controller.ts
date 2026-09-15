import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  @ApiOkResponse({ schema: { example: { success: true, data: { status: 'ok', database: 'connected' } } } })
  check() {
    const dbState = this.connection.readyState;
    return {
      status: 'ok',
      database: dbState === 1 ? 'connected' : 'disconnected',
    };
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