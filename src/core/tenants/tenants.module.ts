import { Module } from '@nestjs/common';
import { TenantProvisioningService } from '@core/tenants/tenant-provisioning.service';
import { TenantsController } from '@core/tenants/tenants.controller';
import { TenantsRepository } from '@core/tenants/tenants.repository';
import { TenantsService } from '@core/tenants/tenants.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository, TenantProvisioningService],
  exports: [TenantsService, TenantProvisioningService],
})
export class TenantsModule {}
