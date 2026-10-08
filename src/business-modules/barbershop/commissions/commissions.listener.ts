import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { CoreEvent, SaleCompletedEvent } from '@core/events/core.events';
import { AppointmentEvent, BarbershopEvent } from '@modules/barbershop/barbershop.events';
import { CommissionsService } from '@modules/barbershop/commissions/commissions.service';

@Injectable()
export class CommissionsListener {
  private readonly logger = new Logger(CommissionsListener.name);

  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @OnEvent(BarbershopEvent.APPOINTMENT_COMPLETED, { promisify: true })
  async onAppointmentCompleted(event: AppointmentEvent): Promise<void> {
    await this.safely(event.tenantId, `appointment ${event.appointmentId}`, () =>
      this.commissionsService.generateForAppointment(event.appointmentId),
    );
  }

  /** Core sales are segment-agnostic; tenants without barbers linked to users simply get no commission. */
  @OnEvent(CoreEvent.SALE_COMPLETED, { async: true, promisify: true })
  async onSaleCompleted(event: SaleCompletedEvent): Promise<void> {
    await this.safely(event.tenantId, `sale ${event.saleId}`, () =>
      this.commissionsService.generateForSale(event.saleId),
    );
  }

  private async safely(tenantId: string, label: string, work: () => Promise<void>): Promise<void> {
    try {
      await this.tenantContext.runForTenant(tenantId, work);
    } catch (error) {
      this.logger.error(
        `Failed to generate commission for ${label}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
