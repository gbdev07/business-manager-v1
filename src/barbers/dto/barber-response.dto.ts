import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BarberResponseDto {
  @ApiProperty({ example: 'uuid-barber-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'Carlos Santos' })
  name!: string;

  @ApiPropertyOptional({ example: '+5511988887777' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Corte clássico e barba' })
  specialty?: string | null;

  @ApiProperty({
    example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  })
  workDays!: string[];

  @ApiPropertyOptional({ example: '09:00' })
  workStartTime?: string | null;

  @ApiPropertyOptional({ example: '18:00' })
  workEndTime?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedBarbersResponseDto {
  @ApiProperty({ type: [BarberResponseDto] })
  data!: BarberResponseDto[];

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class DeactivateBarberResponseDto {
  @ApiProperty({ example: 'Barber deactivated successfully' })
  message!: string;

  @ApiProperty({ type: BarberResponseDto })
  barber!: BarberResponseDto;
}
