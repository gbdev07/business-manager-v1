import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

const ASSIGNABLE_ROLES = ['owner', 'manager', 'barber', 'receptionist'] as const;

export class CreateUserDto {
  @ApiProperty({ example: 'joao.silva@barbearia.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'João' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Barbershop the user will belong to',
    example: 'uuid-barbershop-id',
  })
  @IsUUID()
  barbershopId!: string;

  @ApiProperty({
    description: 'Role assigned within the barbershop',
    enum: ASSIGNABLE_ROLES,
    example: 'barber',
  })
  @IsIn(ASSIGNABLE_ROLES)
  roleSlug!: (typeof ASSIGNABLE_ROLES)[number];
}
