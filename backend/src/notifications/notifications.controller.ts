import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAllForUser(req.user.userId);
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.countUnread(req.user.userId);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.userId);
  }
}