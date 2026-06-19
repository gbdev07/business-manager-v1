-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "duration_days" INTEGER,
ADD COLUMN "benefits" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "next_renewal_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "subscriptions_next_renewal_at_idx" ON "subscriptions"("next_renewal_at");
