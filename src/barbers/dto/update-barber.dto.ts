import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { WEEKDAYS } from '@barbers/constants/barber.constants';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateBarberDto {
  @ApiPropertyOptional({ example: 'Carlos Santos' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Corte clássico e barba' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({
    example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enum: WEEKDAYS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEEKDAYS, { each: true })
  workDays?: string[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'workStartTime must be in HH:mm format' })
  workStartTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'workEndTime must be in HH:mm format' })
  workEndTime?: string;
}
