-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "subscription_interval" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "subscription_type" AS ENUM ('PLAN', 'ENROLLMENT');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('APPOINTMENT', 'SUBSCRIPTION', 'SUBSCRIPTION_RENEWAL', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbershop_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barbershop_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbershops" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barbershops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barbers" (
    "id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "specialty" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birth_date" DATE,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "status" "appointment_status" NOT NULL DEFAULT 'SCHEDULED',
    "price" DECIMAL(10,2),
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "type" "subscription_type" NOT NULL DEFAULT 'PLAN',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" "subscription_interval",
    "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "plan_id" TEXT,
    "customer_id" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "barbershop_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "appointment_id" TEXT,
    "subscription_id" TEXT,
    "type" "payment_type" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "method" "payment_method",
    "description" TEXT,
    "external_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "barbershop_members_barbershop_id_role_id_idx" ON "barbershop_members"("barbershop_id", "role_id");

-- CreateIndex
CREATE INDEX "barbershop_members_barbershop_id_is_active_idx" ON "barbershop_members"("barbershop_id", "is_active");

-- CreateIndex
CREATE INDEX "barbershop_members_deleted_at_idx" ON "barbershop_members"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "barbershop_members_user_id_barbershop_id_key" ON "barbershop_members"("user_id", "barbershop_id");

-- CreateIndex
CREATE UNIQUE INDEX "barbershops_slug_key" ON "barbershops"("slug");

-- CreateIndex
CREATE INDEX "barbershops_is_active_idx" ON "barbershops"("is_active");

-- CreateIndex
CREATE INDEX "barbershops_deleted_at_idx" ON "barbershops"("deleted_at");

-- CreateIndex
CREATE INDEX "barbershops_city_state_idx" ON "barbershops"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_user_id_key" ON "barbers"("user_id");

-- CreateIndex
CREATE INDEX "barbers_barbershop_id_is_active_idx" ON "barbers"("barbershop_id", "is_active");

-- CreateIndex
CREATE INDEX "barbers_barbershop_id_display_name_idx" ON "barbers"("barbershop_id", "display_name");

-- CreateIndex
CREATE INDEX "barbers_deleted_at_idx" ON "barbers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_barbershop_id_email_key" ON "barbers"("barbershop_id", "email");

-- CreateIndex
CREATE INDEX "customers_barbershop_id_phone_idx" ON "customers"("barbershop_id", "phone");

-- CreateIndex
CREATE INDEX "customers_barbershop_id_last_name_first_name_idx" ON "customers"("barbershop_id", "last_name", "first_name");

-- CreateIndex
CREATE INDEX "customers_barbershop_id_is_active_idx" ON "customers"("barbershop_id", "is_active");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_barbershop_id_email_key" ON "customers"("barbershop_id", "email");

-- CreateIndex
CREATE INDEX "appointments_barbershop_id_scheduled_at_idx" ON "appointments"("barbershop_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_barbershop_id_status_scheduled_at_idx" ON "appointments"("barbershop_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_barber_id_scheduled_at_idx" ON "appointments"("barber_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_customer_id_scheduled_at_idx" ON "appointments"("customer_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "appointments_deleted_at_idx" ON "appointments"("deleted_at");

-- CreateIndex
CREATE INDEX "subscriptions_barbershop_id_type_status_idx" ON "subscriptions"("barbershop_id", "type", "status");

-- CreateIndex
CREATE INDEX "subscriptions_barbershop_id_name_idx" ON "subscriptions"("barbershop_id", "name");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_status_idx" ON "subscriptions"("customer_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_deleted_at_idx" ON "subscriptions"("deleted_at");

-- CreateIndex
CREATE INDEX "payments_barbershop_id_status_paid_at_idx" ON "payments"("barbershop_id", "status", "paid_at");

-- CreateIndex
CREATE INDEX "payments_barbershop_id_type_created_at_idx" ON "payments"("barbershop_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "payments_customer_id_created_at_idx" ON "payments"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_appointment_id_idx" ON "payments"("appointment_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_external_id_idx" ON "payments"("external_id");

-- AddForeignKey
ALTER TABLE "barbershop_members" ADD CONSTRAINT "barbershop_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbershop_members" ADD CONSTRAINT "barbershop_members_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbershop_members" ADD CONSTRAINT "barbershop_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_barbershop_id_fkey" FOREIGN KEY ("barbershop_id") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
