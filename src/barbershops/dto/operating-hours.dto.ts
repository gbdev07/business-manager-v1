import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayScheduleDto {
  @ApiPropertyOptional({ example: '09:00', description: 'Opening time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'open must be in HH:mm format' })
  open?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Closing time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'close must be in HH:mm format' })
  close?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  closed!: boolean;
}

export class OperatingHoursDto {
  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  monday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  tuesday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  wednesday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  thursday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  friday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  saturday?: DayScheduleDto;

  @ApiPropertyOptional({ type: DayScheduleDto })
  @IsOptional()
  sunday?: DayScheduleDto;
}

export type OperatingHours = Record<string, { open?: string; close?: string; closed: boolean }>;
