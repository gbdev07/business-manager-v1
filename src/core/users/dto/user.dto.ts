import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ToOptionalBoolean } from '@common/dto/boolean-query.transform';
import { PageMetaDto, PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'João Pereira' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'joao@demo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain uppercase, lowercase and a number',
  })
  password!: string;

  @ApiProperty({
    example: 'EMPLOYEE',
    description: 'Role key (OWNER, ADMIN, MANAGER, EMPLOYEE, ...)',
  })
  @IsString()
  role!: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Pereira' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'MANAGER' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  isActive?: boolean;
}

export class RoleResponseDto {
  @ApiProperty({ example: 'MANAGER' })
  key!: string;

  @ApiProperty({ example: 'Manager' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: [String], example: ['customers:read', 'customers:manage'] })
  permissions!: string[];
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ example: 'MANAGER' })
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
