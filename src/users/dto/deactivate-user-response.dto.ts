import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@users/dto/user-response.dto';

export class DeactivateUserResponseDto {
  @ApiProperty({ example: 'User deactivated successfully' })
  message!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
