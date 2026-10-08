import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

describe('Core flows: sales, payments, subscriptions (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let token: string;
  let customerId: string;

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
      .send({ name: 'Cliente Core', email: `core${uniqueSuffix()}@test.com` })
      .expect(201);
    customerId = customer.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sells catalog items, charges and confirms a manual payment', async () => {
    const [services, products] = await Promise.all([
      auth(http.get(`${API}/services`)).expect(200),
      auth(http.get(`${API}/products`)).expect(200),
    ]);

    const sale = await auth(http.post(`${API}/sales`))
      .send({
        customerId,
        discount: 5,
        items: [
          { type: 'SERVICE', serviceId: services.body.data[0].id, quantity: 1 },
          { type: 'PRODUCT', productId: products.body.data[0].id, quantity: 2 },
        ],
      })
      .expect(201);
    expect(sale.body.items).toHaveLength(2);
    expect(sale.body.status).toBe('COMPLETED');

    const payment = await auth(http.post(`${API}/payments`))
      .send({ customerId, saleId: sale.body.id, amount: Number(sale.body.total), method: 'PIX' })
      .expect(201);
    expect(payment.body).toMatchObject({ status: 'PENDING', gateway: 'MANUAL' });

    const confirmed = await auth(http.patch(`${API}/payments/${payment.body.id}/confirm`))
      .send({})
      .expect(200);
    expect(confirmed.body.status).toBe('PAID');

    await auth(http.patch(`${API}/payments/${payment.body.id}/cancel`)).expect(400);
  });

  it('reports non-integrated gateways as unavailable', async () => {
    const res = await auth(http.get(`${API}/payments/gateways`)).expect(200);
    const byGateway = Object.fromEntries(
      res.body.map((g: { gateway: string; available: boolean }) => [g.gateway, g.available]),
    );
    expect(byGateway).toMatchObject({
      MANUAL: true,
      ASAAS: false,
      MERCADO_PAGO: false,
      STRIPE: false,
    });
  });

  it('subscribes a customer, blocks duplicates and cancels', async () => {
    const plans = await auth(http.get(`${API}/subscription-plans`)).expect(200);
    const planId = plans.body.data[0].id;

    const sub = await auth(http.post(`${API}/subscriptions`))
      .send({ planId, customerId })
      .expect(201);
    expect(sub.body.status).toBe('ACTIVE');

    await auth(http.post(`${API}/subscriptions`))
      .send({ planId, customerId })
      .expect(409);

    const cancelled = await auth(http.patch(`${API}/subscriptions/${sub.body.id}/cancel`))
      .send({ reason: 'Teste' })
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
  });

  it('records audit logs for the tenant', async () => {
    const res = await auth(http.get(`${API}/audit-logs`)).expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
