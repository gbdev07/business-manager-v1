import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { OperatingHoursDto } from '@barbershops/dto/operating-hours.dto';
import { UpdateBarbershopSettingsDto } from '@barbershops/dto/update-barbershop.dto';

export class PatchBarbershopSettingsDto extends UpdateBarbershopSettingsDto {
  @ApiPropertyOptional({
    type: OperatingHoursDto,
    description: 'Weekly operating schedule',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;
}
