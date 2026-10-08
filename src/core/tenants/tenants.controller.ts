import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import {
  TenantResponseDto,
  UpdateTenantDto,
  UpdateTenantSettingsDto,
} from '@core/tenants/dto/tenant.dto';
import { TenantsService } from '@core/tenants/tenants.service';

@ApiTags('Core · Tenants')
@ApiBearerAuth()
@Controller('tenants/current')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions(CorePermission.TENANT_READ)
  @ApiOperation({ summary: 'Get the business (tenant) of the authenticated user' })
  @ApiOkResponse({ type: TenantResponseDto })
  getCurrent(): Promise<TenantResponseDto> {
    return this.tenantsService.getCurrent();
  }

  @Patch()
  @RequirePermissions(CorePermission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Update basic business data' })
  @ApiOkResponse({ type: TenantResponseDto })
  update(@Body() dto: UpdateTenantDto): Promise<TenantResponseDto> {
    return this.tenantsService.updateCurrent(dto);
  }

  @Patch('settings')
  @RequirePermissions(CorePermission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Merge generic business settings' })
  @ApiOkResponse({ type: TenantResponseDto })
  updateSettings(@Body() dto: UpdateTenantSettingsDto): Promise<TenantResponseDto> {
    return this.tenantsService.updateSettings(dto);
  }
}
