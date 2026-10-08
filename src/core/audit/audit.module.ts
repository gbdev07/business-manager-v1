import { Global, Module } from '@nestjs/common';
import { AuditController } from '@core/audit/audit.controller';
import { AuditRepository } from '@core/audit/audit.repository';
import { AuditService } from '@core/audit/audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
