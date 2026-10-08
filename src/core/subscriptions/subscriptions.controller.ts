import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { RequirePermissions } from '@common/decorators/auth.decorators';
import {
  CancelSubscriptionDto,
  CreateSubscriptionDto,
  CreateSubscriptionPlanDto,
  PaginatedPlansDto,
  PaginatedSubscriptionsDto,
  QueryExpiringDto,
  QueryPlansDto,
  QuerySubscriptionsDto,
  SubscriptionPlanResponseDto,
  SubscriptionResponseDto,
  UpdateSubscriptionPlanDto,
} from '@core/subscriptions/dto/subscription.dto';
import { SubscriptionsService } from '@core/subscriptions/subscriptions.service';

class LifecycleResultDto {
  @ApiProperty({ example: 2 })
  expired!: number;

  @ApiProperty({ example: 5 })
  reminded!: number;
}

@ApiTags('Core · Subscriptions')
@ApiBearerAuth()
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscription-plans')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: PaginatedPlansDto })
  listPlans(@Query() query: QueryPlansDto): Promise<PaginatedPlansDto> {
    return this.subscriptionsService.listPlans(query);
  }

  @Get('subscription-plans/:id')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: SubscriptionPlanResponseDto })
  findPlan(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.findPlan(id);
  }

  @Post('subscription-plans')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiCreatedResponse({ type: SubscriptionPlanResponseDto })
  createPlan(@Body() dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.createPlan(dto);
  }

  @Patch('subscription-plans/:id')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiOkResponse({ type: SubscriptionPlanResponseDto })
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Get('subscriptions')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: PaginatedSubscriptionsDto })
  list(@Query() query: QuerySubscriptionsDto): Promise<PaginatedSubscriptionsDto> {
    return this.subscriptionsService.list(query);
  }

  @Get('subscriptions/expiring')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOperation({ summary: 'Active subscriptions ending within N days' })
  @ApiOkResponse({ type: [SubscriptionResponseDto] })
  listExpiring(@Query() query: QueryExpiringDto): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionsService.listExpiring(query.days);
  }

  @Post('subscriptions/lifecycle/run')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiOperation({
    summary: 'Expire overdue subscriptions and send expiration reminders',
    description: 'Manual trigger until a scheduler is introduced.',
  })
  @ApiOkResponse({ type: LifecycleResultDto })
  runLifecycle(@Query() query: QueryExpiringDto): Promise<LifecycleResultDto> {
    return this.subscriptionsService.processLifecycle(query.days);
  }

  @Get('subscriptions/:id')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_READ)
  @ApiOkResponse({ type: SubscriptionResponseDto })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findById(id);
  }

  @Post('subscriptions')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiCreatedResponse({ type: SubscriptionResponseDto })
  create(@Body() dto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(dto);
  }

  @Patch('subscriptions/:id/renew')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiOkResponse({ type: SubscriptionResponseDto })
  renew(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.renew(id);
  }

  @Patch('subscriptions/:id/cancel')
  @RequirePermissions(CorePermission.SUBSCRIPTIONS_MANAGE)
  @ApiOkResponse({ type: SubscriptionResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancel(id, dto);
  }
}
