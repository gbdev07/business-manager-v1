import { InternalServerErrorException } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { CustomersRepository } from '@core/customers/customers.repository';
import { QueryCustomersDto } from '@core/customers/dto/customer.dto';

/** Repository + real database, without HTTP. Requires a migrated DATABASE_URL (never production). */
describe('TenantScopedRepository (integration)', () => {
  const prisma = new PrismaService();
  const tenantContext = new TenantContext();
  const repository = new CustomersRepository(prisma, tenantContext);
  const suffix = `${Date.now()}`;
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    await prisma.$connect();
    const create = (name: string) =>
      prisma.tenant.create({
        data: { name, slug: `${name}-${suffix}`, businessType: BusinessType.SERVICES },
      });
    tenantA = (await create('int-a')).id;
    tenantB = (await create('int-b')).id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma.$disconnect();
  });

  it('writes and reads only inside the current tenant', async () => {
    const customer = await tenantContext.runForTenant(tenantA, () =>
      repository.create({ name: 'Cliente A' }),
    );
    expect(customer.tenantId).toBe(tenantA);

    const fromB = await tenantContext.runForTenant(tenantB, () => repository.findById(customer.id));
    expect(fromB).toBeNull();

    const [listB] = await tenantContext.runForTenant(tenantB, () =>
      repository.findMany(new QueryCustomersDto()),
    );
    expect(listB).toHaveLength(0);
  });

  it('refuses to update records of another tenant', async () => {
    const customer = await tenantContext.runForTenant(tenantA, () =>
      repository.create({ name: 'Cliente A2' }),
    );

    await expect(
      tenantContext.runForTenant(tenantB, () => repository.update(customer.id, { name: 'hack' })),
    ).rejects.toMatchObject({ code: 'P2025' });
  });

  it('fails fast when no tenant context is available', () => {
    expect(() => repository.findById('any')).toThrow(InternalServerErrorException);
  });
});
