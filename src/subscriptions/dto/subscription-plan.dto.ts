import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionInterval } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  @IsUUID()
  barbershopId!: string;

  @ApiProperty({ example: 'Plano Mensal Premium' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '4 cortes por mês + barba' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 149.9 })
  @Type(() => Number)
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: SubscriptionInterval, example: SubscriptionInterval.MONTHLY })
  @IsOptional()
  @IsEnum(SubscriptionInterval)
  interval?: SubscriptionInterval;

  @ApiPropertyOptional({ example: 30, description: 'Plan duration in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiProperty({
    example: ['4 cortes por mês', 'Barba inclusa', '10% desconto em produtos'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  benefits!: string[];
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Plano Mensal Premium' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '4 cortes por mês + barba' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 159.9 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: SubscriptionInterval })
  @IsOptional()
  @IsEnum(SubscriptionInterval)
  interval?: SubscriptionInterval;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];
}
