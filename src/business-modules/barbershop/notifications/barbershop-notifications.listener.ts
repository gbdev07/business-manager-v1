import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { NotificationsService } from '@core/notifications/notifications.service';
import { TenantsService } from '@core/tenants/tenants.service';
import { AppointmentEvent, BarbershopEvent } from '@modules/barbershop/barbershop.events';

@Injectable()
export class BarbershopNotificationsListener {
  private readonly logger = new Logger(BarbershopNotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly tenantsService: TenantsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @OnEvent(BarbershopEvent.APPOINTMENT_CREATED, { async: true, promisify: true })
  async onCreated(event: AppointmentEvent): Promise<void> {
    await this.notify(
      event,
      'Agendamento realizado',
      (when) => `Seu horário foi agendado para ${when}.`,
    );
  }

  @OnEvent(BarbershopEvent.APPOINTMENT_CONFIRMED, { async: true, promisify: true })
  async onConfirmed(event: AppointmentEvent): Promise<void> {
    await this.notify(
      event,
      'Agendamento confirmado',
      (when) => `Seu horário de ${when} está confirmado. Até lá!`,
    );
  }

  private async notify(
    event: AppointmentEvent,
    subject: string,
    body: (when: string) => string,
  ): Promise<void> {
    try {
      await this.tenantContext.runForTenant(event.tenantId, async () => {
        const tenant = await this.tenantsService.getCurrent();
        const when = new Intl.DateTimeFormat('pt-BR', {
          timeZone: tenant.timezone,
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(event.startsAt);

        await this.notificationsService.notifyCustomer({
          customerId: event.customerId,
          subject: `${subject} · ${tenant.name}`,
          body: body(when),
          metadata: { appointmentId: event.appointmentId },
        });
      });
    } catch (error) {
      this.logger.error(
        `Failed to notify appointment ${event.appointmentId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
