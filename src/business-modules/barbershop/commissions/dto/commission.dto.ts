import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionSource, CommissionStatus, CommissionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ToOptionalBoolean } from '@common/dto/boolean-query.transform';
import { PageMetaDto, PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateCommissionRuleDto {
  @ApiPropertyOptional({ description: 'Omit to apply to every barber' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional({ description: 'Restrict to a service (appointments and sale items)' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Restrict to a product (sale items)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  @IsEnum(CommissionType)
  type!: CommissionType;

  @ApiProperty({ example: 40, description: 'Percentage (0-100) or fixed amount per item' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;
}

export class UpdateCommissionRuleDto {
  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  type?: CommissionType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCommissionRulesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  isActive?: boolean;
}

export class CommissionRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  barberId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  serviceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  productId!: string | null;

  @ApiProperty({ enum: CommissionType })
  type!: CommissionType;

  @ApiProperty({ example: '40.00' })
  value!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedCommissionRulesDto {
  @ApiProperty({ type: [CommissionRuleResponseDto] })
  data!: CommissionRuleResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

export class QueryCommissionsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional({ enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CommissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  barberId!: string;

  @ApiProperty()
  barberName!: string;

  @ApiPropertyOptional({ nullable: true })
  ruleId!: string | null;

  @ApiProperty({ enum: CommissionSource })
  source!: CommissionSource;

  @ApiPropertyOptional({ nullable: true })
  appointmentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  saleId!: string | null;

  @ApiProperty({ example: '50.00' })
  baseAmount!: string;

  @ApiProperty({ example: '20.00' })
  amount!: string;

  @ApiProperty({ enum: CommissionStatus })
  status!: CommissionStatus;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CommissionTotalsDto {
  @ApiProperty({ example: '320.00' })
  pending!: string;

  @ApiProperty({ example: '1200.00' })
  paid!: string;
}

export class PaginatedCommissionsDto {
  @ApiProperty({ type: [CommissionResponseDto] })
  data!: CommissionResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;

  @ApiProperty({
    type: CommissionTotalsDto,
    description: 'Totals for the whole filter, not just this page',
  })
  totals!: CommissionTotalsDto;
}
