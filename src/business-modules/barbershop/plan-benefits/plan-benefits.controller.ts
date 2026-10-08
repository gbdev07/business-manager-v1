import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { CorePermission } from '@common/auth/permissions';
import { BusinessModule, RequirePermissions } from '@common/decorators/auth.decorators';
import {
  PlanBenefitResponseDto,
  ReplacePlanBenefitsDto,
  SubscriptionUsageResponseDto,
} from '@modules/barbershop/plan-benefits/dto/plan-benefit.dto';
import { PlanBenefitsService } from '@modules/barbershop/plan-benefits/plan-benefits.service';

@ApiTags('Barbershop · Subscription benefits')
@ApiBearerAuth()
@BusinessModule(BusinessType.BARBERSHOP)
@Controller('barbershop')
export class PlanBenefitsController {
  constructor(private readonly planBenefitsService: PlanBenefitsService) {}

  @Get('plans/:planId/benefits')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: [PlanBenefitResponseDto] })
  list(@Param('planId', ParseUUIDPipe) planId: string): Promise<PlanBenefitResponseDto[]> {
    return this.planBenefitsService.list(planId);
  }

  @Put('plans/:planId/benefits')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiOkResponse({ type: [PlanBenefitResponseDto] })
  replace(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: ReplacePlanBenefitsDto,
  ): Promise<PlanBenefitResponseDto[]> {
    return this.planBenefitsService.replace(planId, dto);
  }

  @Get('subscriptions/:subscriptionId/usage')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: SubscriptionUsageResponseDto })
  usage(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ): Promise<SubscriptionUsageResponseDto> {
    return this.planBenefitsService.usage(subscriptionId);
  }
}
