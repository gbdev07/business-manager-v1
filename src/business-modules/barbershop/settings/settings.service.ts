import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_OPERATING_HOURS,
  OperatingHours,
  parseTimeToMinutes,
  WEEKDAY_KEYS,
} from '@modules/barbershop/common/schedule.util';
import {
  BarbershopSettingsResponseDto,
  UpdateBarbershopSettingsDto,
} from '@modules/barbershop/settings/dto/settings.dto';
import { BarbershopSettingsRepository } from '@modules/barbershop/settings/settings.repository';

@Injectable()
export class BarbershopSettingsService {
  constructor(private readonly repository: BarbershopSettingsRepository) {}

  async get(): Promise<BarbershopSettingsResponseDto> {
    const settings = await this.repository.find();

    return settings
      ? { operatingHours: settings.operatingHours as OperatingHours, updatedAt: settings.updatedAt }
      : { operatingHours: DEFAULT_OPERATING_HOURS, updatedAt: new Date(0) };
  }

  async getOperatingHours(): Promise<OperatingHours> {
    return (await this.get()).operatingHours;
  }

  async update(dto: UpdateBarbershopSettingsDto): Promise<BarbershopSettingsResponseDto> {
    const hours = dto.operatingHours as OperatingHours;
    assertValidOperatingHours(hours);

    const settings = await this.repository.upsert(hours as Prisma.InputJsonValue);
    return {
      operatingHours: settings.operatingHours as OperatingHours,
      updatedAt: settings.updatedAt,
    };
  }

  async initializeDefaults(): Promise<void> {
    if (!(await this.repository.find())) {
      await this.repository.upsert(DEFAULT_OPERATING_HOURS as Prisma.InputJsonValue);
    }
  }
}

function assertValidOperatingHours(hours: OperatingHours): void {
  for (const day of WEEKDAY_KEYS) {
    const value = hours[day];

    if (!value || value.closed) continue;

    if (!value.open || !value.close) {
      throw new BadRequestException(`${day}: open and close are required unless closed is true`);
    }

    if (parseTimeToMinutes(value.open) >= parseTimeToMinutes(value.close)) {
      throw new BadRequestException(`${day}: open must be before close`);
    }
  }
}
