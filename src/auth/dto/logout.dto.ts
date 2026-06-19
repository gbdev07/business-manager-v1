import { ApiProperty } from '@nestjs/swagger';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';

export class LogoutDto extends RefreshTokenDto {}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message!: string;
}
