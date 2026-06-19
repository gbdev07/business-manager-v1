import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperatingHoursDto } from '@barbershops/dto/operating-hours.dto';

export class BarbershopAddressResponseDto {
  @ApiPropertyOptional({ example: 'Rua Exemplo' })
  street?: string | null;

  @ApiPropertyOptional({ example: '100' })
  number?: string | null;

  @ApiPropertyOptional({ example: 'Sala 2' })
  complement?: string | null;

  @ApiPropertyOptional({ example: 'Centro' })
  neighborhood?: string | null;

  @ApiPropertyOptional({ example: 'São Paulo' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'SP' })
  state?: string | null;

  @ApiPropertyOptional({ example: '01000-000' })
  zipCode?: string | null;

  @ApiProperty({ example: 'BR' })
  country!: string;
}

export class BarbershopResponseDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  id!: string;

  @ApiProperty({ example: 'barbearia-premium' })
  slug!: string;

  @ApiProperty({ example: 'Barbearia Premium' })
  name!: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  document?: string | null;

  @ApiPropertyOptional({ example: 'contato@barbeariapremium.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: '+5511999990000' })
  phone?: string | null;

  @ApiProperty({ type: BarbershopAddressResponseDto })
  address!: BarbershopAddressResponseDto;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  logo?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class BarbershopSettingsResponseDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  id!: string;

  @ApiProperty({ example: 'barbearia-premium' })
  slug!: string;

  @ApiProperty({ example: 'Barbearia Premium' })
  name!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  logo?: string | null;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ type: OperatingHoursDto })
  operatingHours!: OperatingHoursDto;
}
