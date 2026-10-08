import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryAppointmentsDto } from '@modules/barbershop/appointments/dto/appointment.dto';

const nameRef = { select: { id: true, name: true } } as const;
const withRefs = { customer: nameRef, barber: nameRef, service: nameRef } as const;

export type AppointmentWithRefs = Prisma.AppointmentGetPayload<{ include: typeof withRefs }>;

/** Statuses that occupy the barber's time slot. */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
];

interface SlotInput {
  barberId: string;
  startsAt: Date;
  endsAt: Date;
}

@Injectable()
export class AppointmentsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryAppointmentsDto): Promise<[AppointmentWithRefs[], number]> {
    const where: Prisma.AppointmentWhereInput = {
      tenantId: this.tenantId,
      barberId: query.barberId,
      customerId: query.customerId,
      status: query.status,
      startsAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };

    return this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: withRefs,
        orderBy: { startsAt: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
  }

  findById(id: string): Promise<AppointmentWithRefs | null> {
    return this.prisma.appointment.findFirst({
      where: { id, tenantId: this.tenantId },
      include: withRefs,
    });
  }

  /**
   * Creates the appointment only if the barber's slot is free. A transaction-scoped advisory
   * lock per barber serializes concurrent bookings so two requests can't take the same slot.
   * Returns null on conflict.
   */
  createIfSlotFree(
    data: Omit<Prisma.AppointmentUncheckedCreateInput, 'tenantId'> & SlotInput,
  ): Promise<AppointmentWithRefs | null> {
    const tenantId = this.tenantId;

    return this.prisma.$transaction(async (tx) => {
      if (await this.slotTaken(tx, tenantId, data)) return null;
      return tx.appointment.create({ data: { ...data, tenantId }, include: withRefs });
    });
  }

  rescheduleIfSlotFree(id: string, slot: SlotInput): Promise<AppointmentWithRefs | null> {
    const tenantId = this.tenantId;

    return this.prisma.$transaction(async (tx) => {
      if (await this.slotTaken(tx, tenantId, slot, id)) return null;
      return tx.appointment.update({
        where: { id, tenantId },
        data: { ...slot, status: AppointmentStatus.SCHEDULED, confirmedAt: null },
        include: withRefs,
      });
    });
  }

  update(id: string, data: Prisma.AppointmentUncheckedUpdateInput): Promise<AppointmentWithRefs> {
    return this.prisma.appointment.update({
      where: { id, tenantId: this.tenantId },
      data,
      include: withRefs,
    });
  }

  countByStatus(from: Date, to: Date): Promise<{ status: AppointmentStatus; count: number }[]> {
    return this.prisma.appointment
      .groupBy({
        by: ['status'],
        where: { tenantId: this.tenantId, startsAt: { gte: from, lte: to } },
        _count: { _all: true },
        orderBy: { status: 'asc' },
      })
      .then((rows) => rows.map((row) => ({ status: row.status, count: row._count._all })));
  }

  private async slotTaken(
    tx: Prisma.TransactionClient,
    tenantId: string,
    slot: SlotInput,
    excludeId?: string,
  ): Promise<boolean> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slot.barberId}))`;

    const overlapping: Pick<Appointment, 'id'> | null = await tx.appointment.findFirst({
      where: {
        tenantId,
        barberId: slot.barberId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: slot.endsAt },
        endsAt: { gt: slot.startsAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    return overlapping !== null;
  }
}
