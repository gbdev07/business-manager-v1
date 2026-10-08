import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, Matches, ValidateNested } from 'class-validator';
import { TIME_PATTERN } from '@modules/barbershop/common/schedule.util';

export class DayHoursDto {
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'open must be HH:mm' })
  open?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'close must be HH:mm' })
  close?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  closed?: boolean;
}

export class OperatingHoursDto {
  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  sunday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  monday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  tuesday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  wednesday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  thursday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  friday?: DayHoursDto;

  @ApiPropertyOptional({ type: DayHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayHoursDto)
  saturday?: DayHoursDto;
}

export class UpdateBarbershopSettingsDto {
  @ApiProperty({ type: OperatingHoursDto })
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours!: OperatingHoursDto;
}

export class BarbershopSettingsResponseDto {
  @ApiProperty({ type: OperatingHoursDto })
  operatingHours!: OperatingHoursDto;

  @ApiProperty()
  updatedAt!: Date;
}
