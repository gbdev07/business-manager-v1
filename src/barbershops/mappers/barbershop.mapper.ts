import { Barbershop } from '@prisma/client';
import {
  BarbershopResponseDto,
  BarbershopSettingsResponseDto,
} from '@barbershops/dto/barbershop-response.dto';
import { OperatingHoursDto } from '@barbershops/dto/operating-hours.dto';

export function mapBarbershopToResponse(barbershop: Barbershop): BarbershopResponseDto {
  return {
    id: barbershop.id,
    slug: barbershop.slug,
    name: barbershop.name,
    document: barbershop.document,
    email: barbershop.email,
    phone: barbershop.phone,
    address: {
      street: barbershop.street,
      number: barbershop.number,
      complement: barbershop.complement,
      neighborhood: barbershop.neighborhood,
      city: barbershop.city,
      state: barbershop.state,
      zipCode: barbershop.zipCode,
      country: barbershop.country,
    },
    logo: barbershop.logoUrl,
    isActive: barbershop.isActive,
    createdAt: barbershop.createdAt,
    updatedAt: barbershop.updatedAt,
  };
}

export function mapBarbershopToSettingsResponse(
  barbershop: Barbershop,
): BarbershopSettingsResponseDto {
  return {
    id: barbershop.id,
    slug: barbershop.slug,
    name: barbershop.name,
    logo: barbershop.logoUrl,
    timezone: barbershop.timezone,
    operatingHours: barbershop.operatingHours as OperatingHoursDto,
  };
}

export function mapAddressToPrisma(address?: {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}) {
  if (!address) {
    return {};
  }

  return {
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
  };
}
