import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { BusinessType } from '@prisma/client';

export interface TenantStore {
  tenantId?: string;
  userId?: string;
  businessType?: BusinessType;
}

/**
 * Request-scoped tenant information backed by AsyncLocalStorage.
 * Populated once per request (TenantContextGuard) and read by repositories,
 * so controllers and services never receive tenantId from the client.
 */
@Injectable()
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(callback: () => T, store: TenantStore = {}): T {
    return TenantContext.storage.run(store, callback);
  }

  /** Executes work (event listeners, jobs) on behalf of a specific tenant. */
  runForTenant<T>(tenantId: string, callback: () => T, businessType?: BusinessType): T {
    return this.run(callback, { tenantId, businessType });
  }

  set(values: TenantStore): void {
    const store = TenantContext.storage.getStore();

    if (!store) {
      throw new InternalServerErrorException('Tenant context is not initialized');
    }

    Object.assign(store, values);
  }

  get tenantId(): string {
    const tenantId = TenantContext.storage.getStore()?.tenantId;

    if (!tenantId) {
      throw new InternalServerErrorException('Tenant context is not available for this operation');
    }

    return tenantId;
  }

  get userId(): string | undefined {
    return TenantContext.storage.getStore()?.userId;
  }

  get businessType(): BusinessType | undefined {
    return TenantContext.storage.getStore()?.businessType;
  }

  hasTenant(): boolean {
    return Boolean(TenantContext.storage.getStore()?.tenantId);
  }
}
