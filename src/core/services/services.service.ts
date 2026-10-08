import { Injectable, NotFoundException } from '@nestjs/common';
import { Service } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import {
  CreateServiceDto,
  QueryServicesDto,
  ServiceResponseDto,
  UpdateServiceDto,
} from '@core/services/dto/service.dto';
import { ServicesRepository } from '@core/services/services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async list(query: QueryServicesDto): Promise<Paginated<ServiceResponseDto>> {
    const [services, total] = await this.servicesRepository.findMany(query);
    return paginate(services.map(toServiceResponse), total, query);
  }

  async findById(id: string): Promise<ServiceResponseDto> {
    const service = await this.servicesRepository.findById(id);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return toServiceResponse(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponse(await this.servicesRepository.create(dto));
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponse(await this.servicesRepository.update(id, dto));
  }

  /** Used by other modules to validate references within the current tenant. */
  async ensureActive(id: string): Promise<Service> {
    const service = await this.servicesRepository.findById(id);

    if (!service || !service.isActive) {
      throw new NotFoundException('Service not found or inactive');
    }

    return service;
  }

  async findActiveByIds(ids: string[]): Promise<Map<string, Service>> {
    const services = await this.servicesRepository.findManyByIds(ids);
    return new Map(services.filter((s) => s.isActive).map((s) => [s.id, s]));
  }
}

export function toServiceResponse(service: Service): ServiceResponseDto {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: toMoneyString(service.price),
    durationMinutes: service.durationMinutes,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}
