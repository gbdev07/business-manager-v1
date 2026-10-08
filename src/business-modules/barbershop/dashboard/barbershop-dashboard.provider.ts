import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppointmentStatus, BusinessType } from '@prisma/client';
import {
  DashboardMetric,
  DashboardMetricsProvider,
  DashboardPeriod,
} from '@core/dashboard/dashboard-metrics.provider';
import { DashboardRegistry } from '@core/dashboard/dashboard.registry';
import { AppointmentsRepository } from '@modules/barbershop/appointments/appointments.repository';
import { BarbersRepository } from '@modules/barbershop/barbers/barbers.repository';

@Injectable()
export class BarbershopDashboardProvider implements DashboardMetricsProvider, OnModuleInit {
  readonly key = 'barbershop';
  readonly label = 'Barbearia';

  constructor(
    private readonly registry: DashboardRegistry,
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly barbersRepository: BarbersRepository,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  supports(businessType: BusinessType): boolean {
    return businessType === BusinessType.BARBERSHOP;
  }

  async getMetrics({ from, to }: DashboardPeriod): Promise<DashboardMetric[]> {
    const [byStatus, activeBarbers] = await Promise.all([
      this.appointmentsRepository.countByStatus(from, to),
      this.barbersRepository.countActive(),
    ]);

    const count = (status: AppointmentStatus) =>
      byStatus.find((row) => row.status === status)?.count ?? 0;
    const total = byStatus.reduce((sum, row) => sum + row.count, 0);
    const cancelled = count(AppointmentStatus.CANCELLED);
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 10000) / 100 : 0;

    return [
      { key: 'appointments', label: 'Agendamentos', value: total, unit: 'count' },
      {
        key: 'completedAppointments',
        label: 'Atendimentos concluídos',
        value: count(AppointmentStatus.COMPLETED),
        unit: 'count',
      },
      { key: 'cancelledAppointments', label: 'Cancelamentos', value: cancelled, unit: 'count' },
      { key: 'noShows', label: 'Faltas', value: count(AppointmentStatus.NO_SHOW), unit: 'count' },
      {
        key: 'cancellationRate',
        label: 'Taxa de cancelamento',
        value: cancellationRate,
        unit: 'percent',
      },
      { key: 'activeBarbers', label: 'Barbeiros ativos', value: activeBarbers, unit: 'count' },
    ];
  }
}
