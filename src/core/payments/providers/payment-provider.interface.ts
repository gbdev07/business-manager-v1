import { PaymentGateway, PaymentMethod, PaymentStatus } from '@prisma/client';

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

export interface ChargeCustomer {
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
}

export interface CreateChargeInput {
  paymentId: string;
  tenantId: string;
  amount: string;
  currency: string;
  method?: PaymentMethod | null;
  description?: string | null;
  dueDate?: Date | null;
  customer?: ChargeCustomer;
}

export interface ChargeResult {
  externalId: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  pixCopyPaste?: string;
  paidAt?: Date;
  raw?: Record<string, unknown>;
}

/** Contract every payment gateway adapter (Asaas, Mercado Pago, Stripe, ...) must fulfill. */
export interface PaymentProvider {
  readonly gateway: PaymentGateway;

  /** False while credentials/integration are missing; the registry exposes this to clients. */
  isAvailable(): boolean;

  createCharge(input: CreateChargeInput): Promise<ChargeResult>;

  getCharge(externalId: string): Promise<ChargeResult>;

  cancelCharge(externalId: string): Promise<ChargeResult>;
}
