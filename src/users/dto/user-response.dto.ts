import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserMembershipResponseDto } from '@users/dto/user-membership-response.dto';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid-user-id' })
  id!: string;

  @ApiProperty({ example: 'joao.silva@barbearia.com' })
  email!: string;

  @ApiProperty({ example: 'João' })
  firstName!: string;

  @ApiProperty({ example: 'Silva' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+5511999990000' })
  phone?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  isSuperAdmin!: boolean;

  @ApiProperty({ type: [UserMembershipResponseDto] })
  memberships!: UserMembershipResponseDto[];

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}
