export interface CustomerContactPayload {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

export interface AppointmentNotificationPayload extends CustomerContactPayload {
  appointmentId: string;
  barbershopId: string;
  barberName: string;
  scheduledAt: Date;
  durationMinutes: number;
}

export interface SubscriptionExpiringPayload extends CustomerContactPayload {
  enrollmentId: string;
  planId: string;
  planName: string;
  barbershopId: string;
  endDate: Date;
  daysUntilExpiry: number;
}

export interface PaymentApprovedPayload extends CustomerContactPayload {
  paymentId: string;
  barbershopId: string;
  amount: string;
  currency: string;
  type: string;
  paidAt: Date;
}
