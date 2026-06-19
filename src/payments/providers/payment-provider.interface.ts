import { PaymentProviderName, PaymentStatus } from '@prisma/client';

export interface CreateProviderChargeInput {
  barbershopId: string;
  customerId?: string;
  amount: number;
  currency: string;
  description?: string;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface ProviderChargeResult {
  externalId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  barcode?: string;
  pixCopyPaste?: string;
  paidAt?: Date;
  providerPayload?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  createCharge(input: CreateProviderChargeInput): Promise<ProviderChargeResult>;

  getCharge(externalId: string): Promise<ProviderChargeResult>;

  cancelCharge(externalId: string): Promise<ProviderChargeResult>;
}
