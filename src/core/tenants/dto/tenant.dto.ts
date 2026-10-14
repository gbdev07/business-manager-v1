import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType, TenantStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsPasswordPolicy } from '@common/validation/password.validators';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Barbearia Central' })
  @IsString()
  @Length(2, 120)
  businessName!: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.BARBERSHOP })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @Length(2, 120)
  ownerName!: string;

  @ApiProperty({ example: 'owner@barbeariacentral.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsPasswordPolicy()
  password!: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Barbearia Central' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ example: 'contato@barbeariacentral.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timezone?: string;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export class UpdateTenantSettingsDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { locale: 'pt-BR', receiptFooter: 'Obrigado pela preferência!' },
    description: 'Generic key/value settings merged into the current settings.',
  })
  @IsObject()
  settings!: Record<string, unknown>;
}

export class TenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: BusinessType })
  businessType!: BusinessType;

  @ApiProperty({ enum: TenantStatus })
  status!: TenantStatus;

  @ApiPropertyOptional({ nullable: true })
  document!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  settings!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
