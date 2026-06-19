import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { AddressDto } from '@barbershops/dto/address.dto';

export class CreateBarbershopDto {
  @ApiProperty({ example: 'Barbearia Premium' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contato@barbeariapremium.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'Public URL of the barbershop logo',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;
}
