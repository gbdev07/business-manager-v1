import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import { NotificationsService } from '@core/notifications/notifications.service';
import { NotificationChannel } from '@core/notifications/providers/notification-provider.interface';

class NotificationChannelStatusDto {
  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ description: 'False while the integration is not implemented/configured' })
  available!: boolean;
}

@ApiTags('Core · Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('channels')
  @RequirePermissions(CorePermission.TENANT_READ)
  @ApiOperation({ summary: 'Registered notification channels and their availability' })
  @ApiOkResponse({ type: [NotificationChannelStatusDto] })
  listChannels(): NotificationChannelStatusDto[] {
    return this.notificationsService.listChannels();
  }
}
