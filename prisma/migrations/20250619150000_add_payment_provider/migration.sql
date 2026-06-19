-- CreateEnum
CREATE TYPE "payment_provider_name" AS ENUM ('MANUAL', 'ASAAS', 'MERCADO_PAGO');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "provider" "payment_provider_name" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "payments"("provider");
