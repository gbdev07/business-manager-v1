import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class PlanBenefitItemDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: 4, description: 'Times the service can be used per billing cycle' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantityPerCycle!: number;
}

export class ReplacePlanBenefitsDto {
  @ApiProperty({ type: [PlanBenefitItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanBenefitItemDto)
  benefits!: PlanBenefitItemDto[];
}

export class PlanBenefitResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  quantityPerCycle!: number;
}

export class BenefitUsageDto extends PlanBenefitResponseDto {
  @ApiProperty()
  used!: number;

  @ApiProperty()
  remaining!: number;
}

export class SubscriptionUsageResponseDto {
  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty()
  cycleStart!: Date;

  @ApiProperty()
  cycleEnd!: Date;

  @ApiProperty({ type: [BenefitUsageDto] })
  benefits!: BenefitUsageDto[];
}
