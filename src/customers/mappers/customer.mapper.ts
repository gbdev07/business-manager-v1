import { Customer } from '@prisma/client';
import { CustomerResponseDto } from '@customers/dto/customer-response.dto';
import { joinFullName } from '@customers/utils/name.util';

export function mapCustomerToResponse(customer: Customer): CustomerResponseDto {
  return {
    id: customer.id,
    barbershopId: customer.barbershopId,
    name: joinFullName(customer.firstName, customer.lastName),
    phone: customer.phone,
    email: customer.email,
    notes: customer.notes,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
