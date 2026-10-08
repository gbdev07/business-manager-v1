import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

/** Returns an ISO date for a weekday at 10:00 America/Sao_Paulo (13:00 UTC), at least `weeksAhead` weeks out. */
function nextWeekdayAt10(weekday: number, weeksAhead: number): string {
  const date = new Date();
  date.setUTCHours(13, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 1);
  while (date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCDate(date.getUTCDate() + 7 * weeksAhead);
  return date.toISOString();
}

describe('Barbershop module (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;
  let customerId: string;
  let barberId: string;
  let haircutId: string;
  // Random future week so repeated runs don't collide with previous appointments.
  const weeksAhead = 10 + Math.floor(Math.random() * 200);

  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());

    const login = await http
      .post(`${API}/auth/login`)
      .send({ email: 'admin@demo.com', password: 'Admin123!' })
      .expect(200);
    token = login.body.accessToken;

    const customer = await auth(http.post(`${API}/customers`))
      .send({ name: 'Cliente Agenda', email: `agenda${uniqueSuffix()}@test.com` })
      .expect(201);
    customerId = customer.body.id;

    const barber = await auth(http.post(`${API}/barbershop/barbers`))
      .send({
        name: `Barbeiro ${uniqueSuffix()}`,
        workDays: ['tuesday', 'wednesday'],
        workStartTime: '09:00',
        workEndTime: '18:00',
      })
      .expect(201);
    barberId = barber.body.id;

    const services = await auth(http.get(`${API}/services`)).expect(200);
    haircutId = services.body.data.find((s: { name: string }) => s.name === 'Corte').id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('books an appointment and rejects overlapping slots for the same barber', async () => {
    const startsAt = nextWeekdayAt10(2, weeksAhead);
    const body = { customerId, barberId, serviceId: haircutId, startsAt };

    const created = await auth(http.post(`${API}/barbershop/appointments`))
      .send(body)
      .expect(201);
    expect(created.body).toMatchObject({ status: 'SCHEDULED', price: '45.00' });

    await auth(http.post(`${API}/barbershop/appointments`))
      .send(body)
      .expect(409);
  });

  it('rejects appointments outside the barber working days', async () => {
    await auth(http.post(`${API}/barbershop/appointments`))
      .send({
        customerId,
        barberId,
        serviceId: haircutId,
        startsAt: nextWeekdayAt10(5, weeksAhead),
      })
      .expect(400);
  });

  it('completing an appointment generates the commission (seeded 40% rule)', async () => {
    const created = await auth(http.post(`${API}/barbershop/appointments`))
      .send({
        customerId,
        barberId,
        serviceId: haircutId,
        startsAt: nextWeekdayAt10(3, weeksAhead),
      })
      .expect(201);
    const id = created.body.id;

    await auth(http.patch(`${API}/barbershop/appointments/${id}/confirm`)).expect(200);
    await auth(http.patch(`${API}/barbershop/appointments/${id}/complete`)).expect(200);
    await auth(http.patch(`${API}/barbershop/appointments/${id}/cancel`))
      .send({})
      .expect(400);

    const commissions = await auth(
      http.get(`${API}/barbershop/commissions?barberId=${barberId}`),
    ).expect(200);
    const commission = commissions.body.data.find(
      (c: { appointmentId: string }) => c.appointmentId === id,
    );
    expect(commission).toMatchObject({ amount: '18.00', baseAmount: '45.00', status: 'PENDING' });
  });

  it('contributes metrics to the core dashboard', async () => {
    const res = await auth(http.get(`${API}/dashboard`)).expect(200);
    const section = res.body.modules.find((m: { key: string }) => m.key === 'barbershop');
    expect(section.metrics.map((m: { key: string }) => m.key)).toContain('appointments');
  });
});
