import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import { AuditService } from '@core/audit/audit.service';
import { PaginatedAuditLogsDto, QueryAuditLogsDto } from '@core/audit/dto/audit-log.dto';

@ApiTags('Core · Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(CorePermission.AUDIT_READ)
  @ApiOperation({ summary: 'List audit logs of the current tenant' })
  @ApiOkResponse({ type: PaginatedAuditLogsDto })
  list(@Query() query: QueryAuditLogsDto): Promise<PaginatedAuditLogsDto> {
    return this.auditService.list(query);
  }
}
