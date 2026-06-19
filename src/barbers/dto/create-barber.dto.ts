import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { WEEKDAYS } from '@barbers/constants/barber.constants';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBarberDto {
  @ApiProperty({
    description: 'Barbershop the barber belongs to',
    example: 'uuid-barbershop-id',
  })
  @IsUUID()
  barbershopId!: string;

  @ApiProperty({ example: 'Carlos Santos' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Corte clássico e barba' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({
    example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enum: WEEKDAYS,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEEKDAYS, { each: true })
  workDays!: string[];

  @ApiProperty({ example: '09:00', description: 'Work start time (HH:mm)' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'workStartTime must be in HH:mm format' })
  workStartTime!: string;

  @ApiProperty({ example: '18:00', description: 'Work end time (HH:mm)' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'workEndTime must be in HH:mm format' })
  workEndTime!: string;
}
