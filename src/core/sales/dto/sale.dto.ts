import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleItemType, SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PageMetaDto, PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateSaleItemDto {
  @ApiProperty({ enum: SaleItemType })
  @IsEnum(SaleItemType)
  type!: SaleItemType;

  @ApiPropertyOptional({ description: 'Required when type = PRODUCT' })
  @ValidateIf((item: CreateSaleItemDto) => item.type === SaleItemType.PRODUCT)
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Required when type = SERVICE' })
  @ValidateIf((item: CreateSaleItemDto) => item.type === SaleItemType.SERVICE)
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ApiPropertyOptional({ example: 45, description: 'Overrides the catalog price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuerySalesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SaleItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SaleItemType })
  type!: SaleItemType;

  @ApiPropertyOptional({ nullable: true })
  productId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  serviceId!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ example: '45.00' })
  unitPrice!: string;

  @ApiProperty({ example: '90.00' })
  total!: string;
}

export class SaleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  customerId!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'User who registered the sale' })
  userId!: string | null;

  @ApiProperty({ enum: SaleStatus })
  status!: SaleStatus;

  @ApiProperty({ example: '95.00' })
  subtotal!: string;

  @ApiProperty({ example: '5.00' })
  discount!: string;

  @ApiProperty({ example: '90.00' })
  total!: string;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [SaleItemResponseDto] })
  items!: SaleItemResponseDto[];

  @ApiProperty()
  completedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedSalesDto {
  @ApiProperty({ type: [SaleResponseDto] })
  data!: SaleResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
