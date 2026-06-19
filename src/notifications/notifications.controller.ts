import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@auth/decorators/roles.decorator';
import { NOTIFICATION_READ_ROLES } from '@notifications/constants/notification.constants';
import {
  NotificationEventsResponseDto,
  NotificationProvidersResponseDto,
} from '@notifications/dto/notification-response.dto';
import { NotificationsService } from '@notifications/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('providers')
  @Roles(...NOTIFICATION_READ_ROLES)
  @ApiOperation({
    summary: 'List notification channels',
    description: 'Shows registered providers for future Email and WhatsApp integration.',
  })
  @ApiOkResponse({ type: NotificationProvidersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  listProviders(): NotificationProvidersResponseDto {
    return this.notificationsService.listProviders();
  }

  @Get('events')
  @Roles(...NOTIFICATION_READ_ROLES)
  @ApiOperation({
    summary: 'List domain events handled by the notifications module',
  })
  @ApiOkResponse({ type: NotificationEventsResponseDto })
  listEvents(): NotificationEventsResponseDto {
    return this.notificationsService.listEvents();
  }
}
