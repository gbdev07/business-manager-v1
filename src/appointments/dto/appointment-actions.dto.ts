import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Min } from 'class-validator';

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Cliente solicitou cancelamento' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;
}
