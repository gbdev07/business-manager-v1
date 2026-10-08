import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Barber } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { UsersService } from '@core/users/users.service';
import { BarbersRepository } from '@modules/barbershop/barbers/barbers.repository';
import {
  BarberResponseDto,
  CreateBarberDto,
  QueryBarbersDto,
  UpdateBarberDto,
} from '@modules/barbershop/barbers/dto/barber.dto';
import { parseTimeToMinutes } from '@modules/barbershop/common/schedule.util';

@Injectable()
export class BarbersService {
  constructor(
    private readonly repository: BarbersRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(query: QueryBarbersDto): Promise<Paginated<BarberResponseDto>> {
    const [barbers, total] = await this.repository.findMany(query);
    return paginate(barbers.map(toBarberResponse), total, query);
  }

  async findById(id: string): Promise<BarberResponseDto> {
    return toBarberResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateBarberDto): Promise<BarberResponseDto> {
    assertWorkHours(dto.workStartTime, dto.workEndTime);
    if (dto.userId) await this.usersService.findById(dto.userId);

    return toBarberResponse(await this.repository.create(dto));
  }

  async update(id: string, dto: UpdateBarberDto): Promise<BarberResponseDto> {
    const current = await this.getOrThrow(id);
    assertWorkHours(
      dto.workStartTime ?? current.workStartTime ?? undefined,
      dto.workEndTime ?? current.workEndTime ?? undefined,
    );
    if (dto.userId) await this.usersService.findById(dto.userId);

    return toBarberResponse(await this.repository.update(id, dto));
  }

  async setActive(id: string, isActive: boolean): Promise<BarberResponseDto> {
    return toBarberResponse(await this.repository.update(id, { isActive }));
  }

  async getOrThrow(id: string): Promise<Barber> {
    const barber = await this.repository.findById(id);

    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    return barber;
  }
}

function assertWorkHours(start?: string, end?: string): void {
  if (Boolean(start) !== Boolean(end)) {
    throw new BadRequestException('workStartTime and workEndTime must be provided together');
  }

  if (start && end && parseTimeToMinutes(start) >= parseTimeToMinutes(end)) {
    throw new BadRequestException('workStartTime must be before workEndTime');
  }
}

export function toBarberResponse(barber: Barber): BarberResponseDto {
  return {
    id: barber.id,
    name: barber.name,
    email: barber.email,
    phone: barber.phone,
    userId: barber.userId,
    specialties: barber.specialties,
    workDays: barber.workDays,
    workStartTime: barber.workStartTime,
    workEndTime: barber.workEndTime,
    isActive: barber.isActive,
    createdAt: barber.createdAt,
  };
}
