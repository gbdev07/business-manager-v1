import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { ToOptionalBoolean } from '@common/dto/boolean-query.transform';
import { PageMetaDto, PaginationQueryDto } from '@common/dto/pagination.dto';
import { TIME_PATTERN, WEEKDAY_KEYS, WeekdayKey } from '@modules/barbershop/common/schedule.util';

export class CreateBarberDto {
  @ApiProperty({ example: 'João Barbeiro' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ example: 'joao@barbearia.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Links the barber to a platform user of the same tenant' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ type: [String], example: ['Corte degradê', 'Barba'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ enum: WEEKDAY_KEYS, isArray: true, example: ['monday', 'tuesday'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(WEEKDAY_KEYS, { each: true })
  workDays?: WeekdayKey[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'workStartTime must be HH:mm' })
  workStartTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'workEndTime must be HH:mm' })
  workEndTime?: string;
}

export class UpdateBarberDto extends PartialType(CreateBarberDto) {}

export class QueryBarbersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  isActive?: boolean;
}

export class BarberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userId!: string | null;

  @ApiProperty({ type: [String] })
  specialties!: string[];

  @ApiProperty({ type: [String] })
  workDays!: string[];

  @ApiPropertyOptional({ nullable: true })
  workStartTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  workEndTime!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedBarbersDto {
  @ApiProperty({ type: [BarberResponseDto] })
  data!: BarberResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
