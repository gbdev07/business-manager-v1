-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN "logo_url" TEXT,
ADD COLUMN "operating_hours" JSONB NOT NULL DEFAULT '{}';
