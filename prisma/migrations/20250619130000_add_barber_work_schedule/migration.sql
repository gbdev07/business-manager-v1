-- AlterTable
ALTER TABLE "barbers" ADD COLUMN "work_days" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "work_start_time" TEXT,
ADD COLUMN "work_end_time" TEXT;
