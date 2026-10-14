import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';

/**
 * Boots the full application against the database in DATABASE_URL.
 * Point it to a dedicated database (migrated + seeded) — never production.
 * `override` allows replacing providers (e.g. external integrations) for a suite.
 */
export async function createTestApp(
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<INestApplication> {
  const moduleRef = await override(Test.createTestingModule({ imports: [AppModule] })).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  return app;
}

export const API = '/api/v1';

export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Polls `check` until it returns a defined value (for work processed in the background). */
export async function waitFor<T>(
  check: () => Promise<T | undefined | null>,
  { timeoutMs = 5000, intervalMs = 50 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await check();
    if (value !== undefined && value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}
