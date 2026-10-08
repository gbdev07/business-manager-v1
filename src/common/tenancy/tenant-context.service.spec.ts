import { InternalServerErrorException } from '@nestjs/common';
import { TenantContext } from '@common/tenancy/tenant-context.service';

describe('TenantContext', () => {
  const context = new TenantContext();

  it('throws when no tenant is bound', () => {
    expect(() => context.tenantId).toThrow(InternalServerErrorException);
    expect(context.hasTenant()).toBe(false);
  });

  it('exposes values set during the request', () => {
    context.run(() => {
      context.set({ tenantId: 't1', userId: 'u1' });
      expect(context.tenantId).toBe('t1');
      expect(context.userId).toBe('u1');
    });
  });

  it('isolates concurrent async flows', async () => {
    const read = (tenantId: string) =>
      context.runForTenant(tenantId, async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        return context.tenantId;
      });

    await expect(Promise.all([read('a'), read('b'), read('c')])).resolves.toEqual(['a', 'b', 'c']);
  });
});
