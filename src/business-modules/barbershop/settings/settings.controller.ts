import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { CorePermission } from '@common/auth/permissions';
import { BusinessModule, RequirePermissions } from '@common/decorators/auth.decorators';
import { BarbershopPermission } from '@modules/barbershop/barbershop.permissions';
import {
  BarbershopSettingsResponseDto,
  UpdateBarbershopSettingsDto,
} from '@modules/barbershop/settings/dto/settings.dto';
import { BarbershopSettingsService } from '@modules/barbershop/settings/settings.service';

@ApiTags('Barbershop · Settings')
@ApiBearerAuth()
@BusinessModule(BusinessType.BARBERSHOP)
@Controller('barbershop/settings')
export class BarbershopSettingsController {
  constructor(private readonly settingsService: BarbershopSettingsService) {}

  @Get()
  @RequirePermissions(CorePermission.TENANT_READ)
  @ApiOkResponse({ type: BarbershopSettingsResponseDto })
  get(): Promise<BarbershopSettingsResponseDto> {
    return this.settingsService.get();
  }

  @Put()
  @RequirePermissions(BarbershopPermission.SETTINGS_MANAGE)
  @ApiOkResponse({ type: BarbershopSettingsResponseDto })
  update(@Body() dto: UpdateBarbershopSettingsDto): Promise<BarbershopSettingsResponseDto> {
    return this.settingsService.update(dto);
  }
}
