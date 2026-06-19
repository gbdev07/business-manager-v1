import { ApiProperty } from '@nestjs/swagger';

export class UserMembershipResponseDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'barbearia-demo' })
  barbershopSlug!: string;

  @ApiProperty({ example: 'barber' })
  roleSlug!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
