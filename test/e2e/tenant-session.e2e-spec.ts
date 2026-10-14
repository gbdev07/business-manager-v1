import { INestApplication } from '@nestjs/common';
import { BusinessType, TenantStatus } from '@prisma/client';
import * as request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { TENANT_ACCESS_DENIED_MESSAGE } from '@core/auth/auth.service';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

describe('Tenant listing and switch (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let prisma: PrismaService;
  const createdTenantIds: string[] = [];

  const password = 'Senha123!';
  let suffix: string;
  let homeAccess: string;
  let homeRefresh: string;
  let otherSessionAccess: string;
  let otherSessionRefresh: string;
  let homeUserId: string;
  let homeTenantId: string;
  let homeCustomerId: string;
  let destinationTenantId: string;
  let destinationCustomerId: string;
  let suspendedTenantId: string;
  let inactiveTenantId: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    suffix = uniqueSuffix();

    const home = await http
      .post(`${API}/auth/register`)
      .send({
        businessName: `Casa ${suffix}`,
        businessType: 'BARBERSHOP',
        ownerName: 'Dona da Casa',
        email: `casa${suffix}@test.com`,
        password,
      })
      .expect(201);
    homeAccess = home.body.accessToken;
    homeRefresh = home.body.refreshToken;
    homeUserId = home.body.user.id;
    homeTenantId = home.body.user.tenantId;
    createdTenantIds.push(homeTenantId);

    const second = await http
      .post(`${API}/auth/login`)
      .send({ email: `casa${suffix}@test.com`, password })
      .expect(200);
    otherSessionAccess = second.body.accessToken;
    otherSessionRefresh = second.body.refreshToken;

    const homeCustomer = await http
      .post(`${API}/customers`)
      .set('Authorization', `Bearer ${homeAccess}`)
      .send({ name: 'Cliente da Casa' })
      .expect(201);
    homeCustomerId = homeCustomer.body.id;

    const destination = await http
      .post(`${API}/auth/register`)
      .send({
        businessName: `Loja ${suffix}`,
        businessType: 'RETAIL',
        ownerName: 'Dono da Loja',
        email: `loja${suffix}@test.com`,
        password,
      })
      .expect(201);
    destinationTenantId = destination.body.user.tenantId;
    createdTenantIds.push(destinationTenantId);

    const destinationCustomer = await http
      .post(`${API}/customers`)
      .set('Authorization', `Bearer ${destination.body.accessToken}`)
      .send({ name: 'Cliente da Loja' })
      .expect(201);
    destinationCustomerId = destinationCustomer.body.id;

    const employee = await prisma.role.findUniqueOrThrow({ where: { key: 'EMPLOYEE' } });
    await prisma.tenantMembership.create({
      data: {
        userId: homeUserId,
        tenantId: destinationTenantId,
        roleId: employee.id,
      },
    });

    const suspended = await prisma.tenant.create({
      data: {
        name: `Suspensa ${suffix}`,
        slug: `suspensa-${suffix}`,
        businessType: BusinessType.SERVICES,
        status: TenantStatus.SUSPENDED,
      },
    });
    suspendedTenantId = suspended.id;
    createdTenantIds.push(suspendedTenantId);
    await prisma.tenantMembership.create({
      data: { userId: homeUserId, tenantId: suspendedTenantId, roleId: employee.id },
    });

    const inactiveTenant = await prisma.tenant.create({
      data: {
        name: `Inativo ${suffix}`,
        slug: `inativo-${suffix}`,
        businessType: BusinessType.SERVICES,
      },
    });
    inactiveTenantId = inactiveTenant.id;
    createdTenantIds.push(inactiveTenantId);
    await prisma.tenantMembership.create({
      data: {
        userId: homeUserId,
        tenantId: inactiveTenantId,
        roleId: employee.id,
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    for (const tenantId of createdTenantIds) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    }
    await app.close();
  });

  const asHome = (req: request.Test) => req.set('Authorization', `Bearer ${homeAccess}`);

  it('rejects unauthenticated listing and switching', async () => {
    await http.get(`${API}/auth/tenants`).expect(401);
    await http
      .post(`${API}/auth/tenants/switch`)
      .send({ tenantId: destinationTenantId })
      .expect(401);
  });

  it('lists only active memberships on active tenants', async () => {
    const res = await asHome(http.get(`${API}/auth/tenants`)).expect(200);

    expect(res.body).toEqual([
      expect.objectContaining({
        id: homeTenantId,
        role: 'OWNER',
        businessType: 'BARBERSHOP',
        isCurrent: true,
      }),
      expect.objectContaining({
        id: destinationTenantId,
        role: 'EMPLOYEE',
        businessType: 'RETAIL',
        isCurrent: false,
      }),
    ]);
    const ids = res.body.map((tenant: { id: string }) => tenant.id);
    expect(ids).not.toContain(suspendedTenantId);
    expect(ids).not.toContain(inactiveTenantId);
  });

  it('refuses a destination the user cannot use, with the same error', async () => {
    for (const tenantId of [
      suspendedTenantId,
      inactiveTenantId,
      '3f1c2a40-7b3e-4d1a-9c2e-6b8a1d4e5f70',
    ]) {
      const res = await asHome(http.post(`${API}/auth/tenants/switch`).send({ tenantId })).expect(
        403,
      );
      expect(res.body.message).toBe(TENANT_ACCESS_DENIED_MESSAGE);
    }

    await asHome(http.post(`${API}/auth/tenants/switch`).send({ tenantId: 'not-a-uuid' })).expect(
      400,
    );
  });

  it('switches one session, keeps the destination role, and leaves the other session on the home tenant', async () => {
    const switched = await asHome(
      http.post(`${API}/auth/tenants/switch`).send({ tenantId: destinationTenantId }),
    ).expect(200);

    expect(switched.body.user).toMatchObject({
      id: homeUserId,
      tenantId: destinationTenantId,
      role: 'EMPLOYEE',
      businessType: 'RETAIL',
    });
    expect(switched.body.user.permissions).not.toContain('*');
    expect(switched.body.user.permissions).not.toContain('users:read');
    expect(switched.body.user.sessionId).toBeUndefined();
    expect(switched.body.accessToken).not.toBe(homeAccess);

    const storedUser = await prisma.user.findUniqueOrThrow({ where: { id: homeUserId } });
    expect(storedUser.tenantId).toBe(homeTenantId);

    await asHome(http.get(`${API}/auth/me`)).expect(401);

    const destinationToken = switched.body.accessToken as string;
    const asDestination = (req: request.Test) =>
      req.set('Authorization', `Bearer ${destinationToken}`);

    await asDestination(http.get(`${API}/customers/${homeCustomerId}`)).expect(404);
    const visible = await asDestination(
      http.get(`${API}/customers/${destinationCustomerId}`),
    ).expect(200);
    expect(visible.body.id).toBe(destinationCustomerId);
    await asDestination(http.get(`${API}/users`)).expect(403);
    await asDestination(http.get(`${API}/dashboard`)).expect(403);

    const stillHome = await http
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${otherSessionAccess}`)
      .expect(200);
    expect(stillHome.body).toMatchObject({ tenantId: homeTenantId, role: 'OWNER' });
    await http
      .get(`${API}/customers/${homeCustomerId}`)
      .set('Authorization', `Bearer ${otherSessionAccess}`)
      .expect(200);

    const listed = await asDestination(http.get(`${API}/auth/tenants`)).expect(200);
    expect(
      listed.body.find((tenant: { id: string }) => tenant.id === destinationTenantId),
    ).toMatchObject({ isCurrent: true, role: 'EMPLOYEE' });

    const refreshedDestination = await http
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: switched.body.refreshToken })
      .expect(200);
    expect(refreshedDestination.body.user).toMatchObject({
      tenantId: destinationTenantId,
      role: 'EMPLOYEE',
    });

    const refreshedHome = await http
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: otherSessionRefresh })
      .expect(200);
    expect(refreshedHome.body.user).toMatchObject({ tenantId: homeTenantId, role: 'OWNER' });

    await http.post(`${API}/auth/refresh`).send({ refreshToken: homeRefresh }).expect(401);
  });
});
