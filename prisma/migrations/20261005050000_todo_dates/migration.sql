-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "date" TEXT,
ADD COLUMN "doneAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill existing rows. Timestamps are stored in UTC; existing users are in UTC+9.
UPDATE "Todo" SET "date" = to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD');
UPDATE "Todo" SET "doneAt" = "updatedAt" WHERE "status" = '1';
UPDATE "Todo" SET "deletedAt" = "updatedAt" WHERE "status" = '2';

ALTER TABLE "Todo" ALTER COLUMN "date" SET NOT NULL;
