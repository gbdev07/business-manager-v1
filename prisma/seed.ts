import { PrismaClient, SubscriptionInterval, SubscriptionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const DEFAULT_OPERATING_HOURS = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: true },
};

const prisma = new PrismaClient();

const ROLES = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Platform-wide administrator with full access',
    isSystem: true,
    permissions: ['*'],
  },
  {
    name: 'Owner',
    slug: 'owner',
    description: 'Barbershop owner with full tenant access',
    isSystem: true,
    permissions: ['barbershop:*', 'barber:*', 'customer:*', 'appointment:*', 'subscription:*', 'payment:*'],
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Barbershop manager with operational access',
    isSystem: true,
    permissions: ['barber:read', 'customer:*', 'appointment:*', 'subscription:read', 'payment:read'],
  },
  {
    name: 'Barber',
    slug: 'barber',
    description: 'Barber with access to own schedule and customers',
    isSystem: true,
    permissions: ['appointment:read', 'appointment:update', 'customer:read'],
  },
  {
    name: 'Receptionist',
    slug: 'receptionist',
    description: 'Front desk with scheduling and customer management',
    isSystem: true,
    permissions: ['customer:*', 'appointment:*', 'payment:create'],
  },
] as const;

async function seedRoles() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions,
      },
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions,
      },
    });
  }
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@business-manager.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123!';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${email}`);
}

async function seedDemoBarbershop() {
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { slug: 'owner' } });
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@business-manager.com' },
  });

  const barbershop = await prisma.barbershop.upsert({
    where: { slug: 'barbearia-demo' },
    update: {
      name: 'Barbearia Demo',
      email: 'contato@barbearia-demo.com',
      phone: '+5511999990000',
      city: 'São Paulo',
      state: 'SP',
      operatingHours: DEFAULT_OPERATING_HOURS,
      isActive: true,
      deletedAt: null,
    },
    create: {
      slug: 'barbearia-demo',
      name: 'Barbearia Demo',
      email: 'contato@barbearia-demo.com',
      phone: '+5511999990000',
      street: 'Rua Exemplo',
      number: '100',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      country: 'BR',
      operatingHours: DEFAULT_OPERATING_HOURS,
    },
  });

  await prisma.barbershopMember.upsert({
    where: {
      userId_barbershopId: {
        userId: admin.id,
        barbershopId: barbershop.id,
      },
    },
    update: {
      roleId: ownerRole.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      userId: admin.id,
      barbershopId: barbershop.id,
      roleId: ownerRole.id,
    },
  });

  const existingPlan = await prisma.subscription.findFirst({
    where: {
      barbershopId: barbershop.id,
      type: SubscriptionType.PLAN,
      name: 'Plano Mensal Premium',
    },
  });

  if (!existingPlan) {
    await prisma.subscription.create({
      data: {
        barbershopId: barbershop.id,
        type: SubscriptionType.PLAN,
        name: 'Plano Mensal Premium',
        description: '4 cortes por mês + barba',
        price: 149.9,
        currency: 'BRL',
        interval: SubscriptionInterval.MONTHLY,
      },
    });
  }

  console.log(`Demo barbershop ready: ${barbershop.slug}`);
}

async function main() {
  console.log('Starting seed...');

  await seedRoles();
  await seedAdminUser();
  await seedDemoBarbershop();

  console.log('Seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
