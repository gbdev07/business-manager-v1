import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@notifications/constants/notification.constants';

export class NotificationProvidersResponseDto {
  @ApiProperty({ enum: NotificationChannel, isArray: true })
  available!: NotificationChannel[];

  @ApiProperty({
    example:
      'EMAIL and WHATSAPP providers are registered as stubs — implement gateway clients when ready.',
  })
  note!: string;
}

export class NotificationEventsResponseDto {
  @ApiProperty({
    example: [
      'notification.appointment.created',
      'notification.appointment.confirmed',
      'notification.subscription.expiring',
      'notification.payment.approved',
    ],
  })
  events!: string[];

  @ApiProperty({
    example: 'Events are emitted via NestJS EventEmitter and handled asynchronously by listeners.',
  })
  note!: string;
}
