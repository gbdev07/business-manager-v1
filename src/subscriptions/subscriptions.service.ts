import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus, SubscriptionType } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import {
  AUTO_RENEWAL_RULES,
  CANCELLABLE_ENROLLMENT_STATUSES,
  RENEWABLE_STATUSES,
} from '@subscriptions/constants/subscription.constants';
import {
  EnrollCustomerDto,
  CancelEnrollmentDto,
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
import {
  enrollmentInclude,
  mapEnrollmentToResponse,
  mapPlanToResponse,
} from '@subscriptions/mappers/subscription.mapper';
import {
  calculateEndDate,
  calculateNextRenewalAt,
  resolveDurationDays,
} from '@subscriptions/utils/subscription.util';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  getAutoRenewalRules(): AutoRenewalRulesResponseDto {
    return {
      ...AUTO_RENEWAL_RULES,
      description:
        'When autoRenew=true and nextRenewalAt <= now, a scheduled job should renew the enrollment and create a SUBSCRIPTION_RENEWAL payment.',
    };
  }

  async createPlan(
    dto: CreateSubscriptionPlanDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    this.assertBarbershopWriteAccess(currentUser, dto.barbershopId);
    await this.assertBarbershopExists(dto.barbershopId);

    const durationDays = resolveDurationDays(dto.durationDays, dto.interval);

    const plan = await this.prisma.subscription.create({
      data: {
        barbershopId: dto.barbershopId,
        type: SubscriptionType.PLAN,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'BRL',
        interval: dto.interval,
        durationDays,
        benefits: dto.benefits,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    return mapPlanToResponse(plan);
  }

  async findAllPlans(
    query: QuerySubscriptionPlansDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedPlansResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      type: SubscriptionType.PLAN,
      barbershopId: this.resolveBarbershopFilter(query.barbershopId, currentUser),
    };

    if (!query.includeInactive) {
      where.deletedAt = null;
      where.status = SubscriptionStatus.ACTIVE;
    }

    const [plans, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: plans.map(mapPlanToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findPlanById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.findPlanOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, plan.barbershopId);
    return mapPlanToResponse(plan);
  }

  async updatePlan(
    id: string,
    dto: UpdateSubscriptionPlanDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.findPlanOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, plan.barbershopId);

    const durationDays =
      dto.durationDays !== undefined || dto.interval !== undefined
        ? resolveDurationDays(dto.durationDays ?? plan.durationDays, dto.interval ?? plan.interval)
        : undefined;

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        interval: dto.interval,
        durationDays,
        benefits: dto.benefits,
      },
    });

    return mapPlanToResponse(updated);
  }

  async deactivatePlan(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.findPlanOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, plan.barbershopId);

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return mapPlanToResponse(updated);
  }

  async enrollCustomer(
    dto: EnrollCustomerDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    const plan = await this.findPlanOrThrow(dto.planId);
    this.assertBarbershopWriteAccess(currentUser, plan.barbershopId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        barbershopId: plan.barbershopId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in this barbershop');
    }

    const activeEnrollment = await this.prisma.subscription.findFirst({
      where: {
        type: SubscriptionType.ENROLLMENT,
        planId: plan.id,
        customerId: dto.customerId,
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (activeEnrollment) {
      throw new ConflictException('Customer already has an active enrollment for this plan');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const durationDays = resolveDurationDays(plan.durationDays, plan.interval);
    const endDate = calculateEndDate(startDate, durationDays);
    const autoRenew = dto.autoRenew ?? false;
    const nextRenewalAt = autoRenew ? calculateNextRenewalAt(endDate) : null;

    const enrollment = await this.prisma.subscription.create({
      data: {
        barbershopId: plan.barbershopId,
        type: SubscriptionType.ENROLLMENT,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        durationDays,
        benefits: plan.benefits as Prisma.InputJsonValue,
        status: SubscriptionStatus.ACTIVE,
        planId: plan.id,
        customerId: dto.customerId,
        startDate,
        endDate,
        autoRenew,
        nextRenewalAt,
      },
      include: enrollmentInclude,
    });

    return mapEnrollmentToResponse(enrollment);
  }

  async findAllEnrollments(
    query: QueryEnrollmentsDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedEnrollmentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      type: SubscriptionType.ENROLLMENT,
      deletedAt: null,
      barbershopId: this.resolveBarbershopFilter(query.barbershopId, currentUser),
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.planId) {
      where.planId = query.planId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: enrollmentInclude,
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: enrollments.map(mapEnrollmentToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findEnrollmentById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    const enrollment = await this.findEnrollmentOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, enrollment.barbershopId);
    return mapEnrollmentToResponse(enrollment);
  }

  async renewEnrollment(
    id: string,
    dto: RenewEnrollmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    const enrollment = await this.findEnrollmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, enrollment.barbershopId);
    this.assertEnrollmentStatus(enrollment.status, RENEWABLE_STATUSES, 'renew');

    const durationDays = resolveDurationDays(enrollment.durationDays, enrollment.interval);
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : enrollment.endDate && enrollment.endDate.getTime() > Date.now()
        ? enrollment.endDate
        : new Date();
    const endDate = calculateEndDate(startDate, durationDays);
    const autoRenew = dto.autoRenew ?? enrollment.autoRenew;
    const nextRenewalAt = autoRenew ? calculateNextRenewalAt(endDate) : null;

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        autoRenew,
        nextRenewalAt,
      },
      include: enrollmentInclude,
    });

    return mapEnrollmentToResponse(updated);
  }

  async cancelEnrollment(
    id: string,
    dto: CancelEnrollmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<SubscriptionEnrollmentResponseDto> {
    const enrollment = await this.findEnrollmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, enrollment.barbershopId);
    this.assertEnrollmentStatus(enrollment.status, CANCELLABLE_ENROLLMENT_STATUSES, 'cancel');

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
        nextRenewalAt: null,
        description: dto.reason
          ? [enrollment.description, `Cancelled: ${dto.reason}`].filter(Boolean).join(' | ')
          : enrollment.description,
      },
      include: enrollmentInclude,
    });

    return mapEnrollmentToResponse(updated);
  }

  /**
   * Future hook for scheduled auto-renewal job.
   * Finds enrollments due for renewal based on AUTO_RENEWAL_RULES.
   */
  async findEnrollmentsDueForAutoRenewal(): Promise<SubscriptionEnrollmentResponseDto[]> {
    const now = new Date();

    const enrollments = await this.prisma.subscription.findMany({
      where: {
        type: SubscriptionType.ENROLLMENT,
        autoRenew: true,
        deletedAt: null,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED] },
        nextRenewalAt: { lte: now },
      },
      include: enrollmentInclude,
      take: 100,
    });

    return enrollments.map(mapEnrollmentToResponse);
  }

  private resolveBarbershopFilter(
    barbershopId: string | undefined,
    currentUser: AuthenticatedUser,
  ): string | Prisma.StringFilter {
    if (currentUser.isSuperAdmin) {
      if (barbershopId) {
        return barbershopId;
      }
      throw new BadRequestException('barbershopId is required');
    }

    const allowedBarbershopIds = currentUser.memberships.map(
      (membership) => membership.barbershopId,
    );

    if (allowedBarbershopIds.length === 0) {
      throw new ForbiddenException('You do not belong to any barbershop');
    }

    if (barbershopId) {
      if (!allowedBarbershopIds.includes(barbershopId)) {
        throw new ForbiddenException('You do not have access to this barbershop');
      }
      return barbershopId;
    }

    if (allowedBarbershopIds.length === 1) {
      return allowedBarbershopIds[0];
    }

    return { in: allowedBarbershopIds };
  }

  private async assertBarbershopExists(barbershopId: string): Promise<void> {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId, deletedAt: null, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }
  }

  private assertBarbershopReadAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const hasAccess = currentUser.memberships.some(
      (membership) => membership.barbershopId === barbershopId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this barbershop');
    }
  }

  private assertBarbershopWriteAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const membership = currentUser.memberships.find((item) => item.barbershopId === barbershopId);

    if (!membership || !['owner', 'manager', 'receptionist'].includes(membership.roleSlug)) {
      throw new ForbiddenException(
        'You do not have permission to manage subscriptions in this barbershop',
      );
    }
  }

  private assertEnrollmentStatus(
    currentStatus: SubscriptionStatus,
    allowed: readonly string[],
    action: string,
  ): void {
    if (!allowed.includes(currentStatus)) {
      throw new BadRequestException(`Cannot ${action} enrollment with status ${currentStatus}`);
    }
  }

  private async findPlanOrThrow(id: string) {
    const plan = await this.prisma.subscription.findFirst({
      where: {
        id,
        type: SubscriptionType.PLAN,
        deletedAt: null,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  private async findEnrollmentOrThrow(id: string) {
    const enrollment = await this.prisma.subscription.findFirst({
      where: {
        id,
        type: SubscriptionType.ENROLLMENT,
        deletedAt: null,
      },
      include: enrollmentInclude,
    });

    if (!enrollment) {
      throw new NotFoundException('Subscription enrollment not found');
    }

    return enrollment;
  }
}
