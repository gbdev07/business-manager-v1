import { ApiProperty } from '@nestjs/swagger';

export class AuthUserMembershipDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'barbearia-demo' })
  barbershopSlug!: string;

  @ApiProperty({ example: 'owner' })
  roleSlug!: string;
}

export class AuthUserDto {
  @ApiProperty({ example: 'uuid-user-id' })
  id!: string;

  @ApiProperty({ example: 'admin@business-manager.com' })
  email!: string;

  @ApiProperty({ example: 'System' })
  firstName!: string;

  @ApiProperty({ example: 'Administrator' })
  lastName!: string;

  @ApiProperty({ example: true })
  isSuperAdmin!: boolean;

  @ApiProperty({ type: [AuthUserMembershipDto] })
  memberships!: AuthUserMembershipDto[];
}

export class AuthTokensDto {
  @ApiProperty({
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Opaque refresh token for obtaining new access tokens',
    example: 'a1b2c3d4e5f6789...',
  })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 900,
  })
  expiresIn!: number;
}

export class AuthResponseDto extends AuthTokensDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
