import { PaymentStatus } from '@prisma/client';

export const PAYMENT_WRITE_ROLES = ['super_admin', 'owner', 'manager', 'receptionist'] as const;

export const PAYMENT_READ_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'receptionist',
  'barber',
] as const;

export const CANCELLABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
];
