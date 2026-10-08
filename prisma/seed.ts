/**
 * Development seed. Creates the system roles and a demo barbershop tenant.
 * The credentials below are for LOCAL DEVELOPMENT ONLY.
 */
import {
  BillingInterval,
  BusinessType,
  CommissionType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { buildSystemRoles, SystemRole } from '../src/core/users/system-roles';
import { BARBERSHOP_ROLE_PERMISSIONS } from '../src/business-modules/barbershop/barbershop.permissions';
import { DEFAULT_OPERATING_HOURS } from '../src/business-modules/barbershop/common/schedule.util';

const prisma = new PrismaClient();

const DEMO_TENANT_SLUG = 'barbearia-demo';
const DEMO_ADMIN_EMAIL = 'admin@demo.com';
const DEMO_ADMIN_PASSWORD = 'Admin123!';

async function seedRoles(): Promise<void> {
  for (const role of buildSystemRoles([BARBERSHOP_ROLE_PERMISSIONS])) {
    await prisma.role.upsert({
      where: { key: role.key },
      create: { ...role, isSystem: true },
      update: { name: role.name, description: role.description, permissions: role.permissions },
    });
  }
}

async function main(): Promise<void> {
  await seedRoles();

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    create: {
      name: 'Barbearia Demo',
      slug: DEMO_TENANT_SLUG,
      businessType: BusinessType.BARBERSHOP,
      email: 'contato@barbeariademo.com',
      phone: '+5511999999999',
    },
    update: {},
  });
  const tenantId = tenant.id;

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { key: SystemRole.OWNER } });
  await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    create: {
      tenantId,
      roleId: ownerRole.id,
      name: 'Administrador Demo',
      email: DEMO_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
    },
    update: {},
  });

  await prisma.barbershopSettings.upsert({
    where: { tenantId },
    create: { tenantId, operatingHours: DEFAULT_OPERATING_HOURS as Prisma.InputJsonValue },
    update: {},
  });

  const services = [
    { name: 'Corte', price: 45, durationMinutes: 30 },
    { name: 'Barba', price: 35, durationMinutes: 30 },
    { name: 'Corte + Barba', price: 70, durationMinutes: 60 },
  ];
  const [haircut] = await Promise.all(
    services.map((service) =>
      prisma.service.upsert({
        where: { tenantId_name: { tenantId, name: service.name } },
        create: { ...service, tenantId },
        update: {},
      }),
    ),
  );

  const products = [
    { name: 'Pomada modeladora', sku: 'POM-001', price: 39.9 },
    { name: 'Óleo para barba', sku: 'OLEO-001', price: 49.9 },
  ];
  await Promise.all(
    products.map((product) =>
      prisma.product.upsert({
        where: { tenantId_sku: { tenantId, sku: product.sku } },
        create: { ...product, tenantId },
        update: {},
      }),
    ),
  );

  await prisma.barber.upsert({
    where: { tenantId_email: { tenantId, email: 'rafael@barbeariademo.com' } },
    create: {
      tenantId,
      name: 'Rafael Souza',
      email: 'rafael@barbeariademo.com',
      specialties: ['Corte degradê', 'Barba'],
      workDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      workStartTime: '09:00',
      workEndTime: '18:00',
    },
    update: {},
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { tenantId_name: { tenantId, name: 'Plano Mensal' } },
    create: {
      tenantId,
      name: 'Plano Mensal',
      description: 'Até 4 cortes por mês',
      price: 129.9,
      billingInterval: BillingInterval.MONTHLY,
      durationDays: 30,
    },
    update: {},
  });

  await prisma.barbershopPlanBenefit.upsert({
    where: { planId_serviceId: { planId: plan.id, serviceId: haircut.id } },
    create: { tenantId, planId: plan.id, serviceId: haircut.id, quantityPerCycle: 4 },
    update: {},
  });

  if ((await prisma.commissionRule.count({ where: { tenantId } })) === 0) {
    await prisma.commissionRule.create({
      data: { tenantId, type: CommissionType.PERCENTAGE, value: 40 },
    });
  }

  console.log('Seed completed.');
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  Login (development only): ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
