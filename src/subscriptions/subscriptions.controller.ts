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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import {
  SUBSCRIPTION_READ_ROLES,
  SUBSCRIPTION_WRITE_ROLES,
} from '@subscriptions/constants/subscription.constants';
import {
  CancelEnrollmentDto,
  EnrollCustomerDto,
  RenewEnrollmentDto,
} from '@subscriptions/dto/subscription-enrollment.dto';
import {
  QueryEnrollmentsDto,
  QuerySubscriptionPlansDto,
} from '@subscriptions/dto/query-subscriptions.dto';
import {
  AutoRenewalRulesResponseDto,
  PaginatedEnrollmentsResponseDto,
  PaginatedPlansResponseDto,
  SubscriptionEnrollmentResponseDto,
  SubscriptionPlanResponseDto,
} from '@subscriptions/dto/subscription-response.dto';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '@subscriptions/dto/subscription-plan.dto';
import { SubscriptionsService } from '@subscriptions/subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('auto-renewal/rules')
  @Roles(...SUBSCRIPTION_READ_ROLES)
  @ApiOperation({
    summary: 'Get automatic renewal rules',
    description: 'Documents future auto-renewal behavior for scheduled jobs.',
  })
  @ApiOkResponse({ type: AutoRenewalRulesResponseDto })
  getAutoRenewalRules(): AutoRenewalRulesResponseDto {
    return this.subscriptionsService.getAutoRenewalRules();
  }

  @Post('plans')
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({ summary: 'Create subscription plan' })
  @ApiCreatedResponse({ type: SubscriptionPlanResponseDto })
  createPlan(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.createPlan(dto, currentUser);
  }

  @Get('plans')
  @Roles(...SUBSCRIPTION_READ_ROLES)
  @ApiOperation({ summary: 'List subscription plans' })
  @ApiOkResponse({ type: PaginatedPlansResponseDto })
  findAllPlans(
    @Query() query: QuerySubscriptionPlansDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedPlansResponseDto> {
    return this.subscriptionsService.findAllPlans(query, currentUser);
  }

  @Get('plans/:id')
  @Roles(...SUBSCRIPTION_READ_ROLES)
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiOkResponse({ type: SubscriptionPlanResponseDto })
  findPlanById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.findPlanById(id, currentUser);
  }

  @Patch('plans/:id')
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiOkResponse({ type: SubscriptionPlanResponseDto })
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.updatePlan(id, dto, currentUser);
  }

  @Patch('plans/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({ summary: 'Deactivate subscription plan' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiOkResponse({ type: SubscriptionPlanResponseDto })
  deactivatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.deactivatePlan(id, currentUser);
  }

  @Post('enrollments')
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({
    summary: 'Enroll customer in a plan',
    description: 'Links a customer to a plan with start/end dates and optional auto-renewal.',
  })
  @ApiCreatedResponse({ type: SubscriptionEnrollmentResponseDto })
  @ApiConflictResponse({ description: 'Customer already enrolled in this plan' })
  enrollCustomer(
    @Body() dto: EnrollCustomerDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    return this.subscriptionsService.enrollCustomer(dto, currentUser);
  }

  @Get('enrollments')
  @Roles(...SUBSCRIPTION_READ_ROLES)
  @ApiOperation({ summary: 'List customer enrollments' })
  @ApiOkResponse({ type: PaginatedEnrollmentsResponseDto })
  findAllEnrollments(
    @Query() query: QueryEnrollmentsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedEnrollmentsResponseDto> {
    return this.subscriptionsService.findAllEnrollments(query, currentUser);
  }

  @Get('enrollments/:id')
  @Roles(...SUBSCRIPTION_READ_ROLES)
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiOkResponse({ type: SubscriptionEnrollmentResponseDto })
  findEnrollmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    return this.subscriptionsService.findEnrollmentById(id, currentUser);
  }

  @Patch('enrollments/:id/renew')
  @HttpCode(HttpStatus.OK)
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({
    summary: 'Renew customer enrollment',
    description: 'Extends start/end dates and recalculates nextRenewalAt for auto-renewal.',
  })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiOkResponse({ type: SubscriptionEnrollmentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid enrollment status' })
  renewEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewEnrollmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    return this.subscriptionsService.renewEnrollment(id, dto, currentUser);
  }

  @Patch('enrollments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(...SUBSCRIPTION_WRITE_ROLES)
  @ApiOperation({
    summary: 'Cancel customer enrollment',
    description: 'Sets status to CANCELLED and disables auto-renewal.',
  })
  @ApiParam({ name: 'id', description: 'Enrollment UUID' })
  @ApiOkResponse({ type: SubscriptionEnrollmentResponseDto })
  cancelEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelEnrollmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    return this.subscriptionsService.cancelEnrollment(id, dto, currentUser);
  }
}
