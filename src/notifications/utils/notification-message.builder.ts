import {
  AppointmentNotificationPayload,
  PaymentApprovedPayload,
  SubscriptionExpiringPayload,
} from '@notifications/events/notification-payloads';

function formatDate(date: Date): string {
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function buildAppointmentCreatedMessage(payload: AppointmentNotificationPayload): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Agendamento criado',
    body: [
      `Olá ${payload.customerName},`,
      '',
      `Seu agendamento foi registrado com ${payload.barberName}.`,
      `Data/hora: ${formatDate(payload.scheduledAt)}`,
      `Duração: ${payload.durationMinutes} minutos`,
      '',
      'Aguardamos você!',
    ].join('\n'),
  };
}

export function buildAppointmentConfirmedMessage(payload: AppointmentNotificationPayload): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Agendamento confirmado',
    body: [
      `Olá ${payload.customerName},`,
      '',
      `Seu agendamento com ${payload.barberName} foi confirmado.`,
      `Data/hora: ${formatDate(payload.scheduledAt)}`,
      '',
      'Até lá!',
    ].join('\n'),
  };
}

export function buildSubscriptionExpiringMessage(payload: SubscriptionExpiringPayload): {
  subject: string;
  body: string;
} {
  const daysLabel = payload.daysUntilExpiry === 1 ? '1 dia' : `${payload.daysUntilExpiry} dias`;

  return {
    subject: 'Seu plano está vencendo',
    body: [
      `Olá ${payload.customerName},`,
      '',
      `Seu plano "${payload.planName}" vence em ${daysLabel} (${formatDate(payload.endDate)}).`,
      'Renove para continuar aproveitando os benefícios.',
    ].join('\n'),
  };
}

export function buildPaymentApprovedMessage(payload: PaymentApprovedPayload): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Pagamento aprovado',
    body: [
      `Olá ${payload.customerName},`,
      '',
      `Seu pagamento de ${payload.currency} ${payload.amount} foi aprovado.`,
      `Tipo: ${payload.type}`,
      `Data: ${formatDate(payload.paidAt)}`,
    ].join('\n'),
  };
}
