import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({ example: 'uuid-customer-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiPropertyOptional({ example: '+5511977776666' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'joao.silva@email.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: 'Prefere corte baixo nas laterais' })
  notes?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedCustomersResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  data!: CustomerResponseDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
