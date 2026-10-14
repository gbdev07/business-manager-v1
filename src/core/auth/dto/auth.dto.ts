import { ApiProperty } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsJWT, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import {
  IsPasswordPolicy,
  MatchesProperty,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@common/validation/password.validators';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsJWT()
  refreshToken!: string;
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.BARBERSHOP })
  businessType!: BusinessType;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ example: 'OWNER' })
  role!: string;

  @ApiProperty({ type: [String], example: ['*'] })
  permissions!: string[];
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;
}

const PASSWORD_POLICY_DESCRIPTION =
  `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters, ` +
  'with at least one uppercase letter, one lowercase letter and one number.';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'owner@barbeariacentral.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token received in the password reset link (`?token=...`).',
    example: 'q3Jk0m8xZ2V5LXRva2VuLWV4YW1wbGUtMzJieXRlcw',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;

  @ApiProperty({ example: 'NewStrongPass123!', description: PASSWORD_POLICY_DESCRIPTION })
  @IsPasswordPolicy()
  newPassword!: string;

  @ApiProperty({ example: 'NewStrongPass123!', description: 'Must be equal to newPassword.' })
  @IsString()
  @MatchesProperty('newPassword')
  confirmPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({ example: 'NewStrongPass123!', description: PASSWORD_POLICY_DESCRIPTION })
  @IsPasswordPolicy()
  newPassword!: string;

  @ApiProperty({ example: 'NewStrongPass123!', description: 'Must be equal to newPassword.' })
  @IsString()
  @MatchesProperty('newPassword')
  confirmPassword!: string;
}
