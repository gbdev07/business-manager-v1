import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BusinessType } from '@prisma/client';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { CoreEvent, TenantCreatedEvent } from '@core/events/core.events';
import { BarbershopSettingsService } from '@modules/barbershop/settings/settings.service';

/** Provisions barbershop defaults when a barbershop tenant signs up. */
@Injectable()
export class BarbershopTenantListener {
  constructor(
    private readonly settingsService: BarbershopSettingsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @OnEvent(CoreEvent.TENANT_CREATED, { promisify: true })
  async onTenantCreated(event: TenantCreatedEvent): Promise<void> {
    if (event.businessType !== BusinessType.BARBERSHOP) return;

    await this.tenantContext.runForTenant(
      event.tenantId,
      () => this.settingsService.initializeDefaults(),
      event.businessType,
    );
  }
}
