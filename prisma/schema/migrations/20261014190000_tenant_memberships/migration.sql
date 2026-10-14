-- Access of a user identity to a tenant. Backfill one active membership per existing user.
CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

INSERT INTO "tenant_memberships" ("id", "user_id", "tenant_id", "role_id", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", "tenant_id", "role_id", true, "created_at", "updated_at"
FROM "users";

CREATE UNIQUE INDEX "tenant_memberships_user_id_tenant_id_key" ON "tenant_memberships"("user_id", "tenant_id");
CREATE INDEX "tenant_memberships_tenant_id_is_active_idx" ON "tenant_memberships"("tenant_id", "is_active");

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Each refresh token remembers the tenant of that session only.
ALTER TABLE "refresh_tokens" ADD COLUMN "tenant_id" TEXT;

UPDATE "refresh_tokens" AS rt
SET "tenant_id" = u."tenant_id"
FROM "users" AS u
WHERE u."id" = rt."user_id";

ALTER TABLE "refresh_tokens" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
