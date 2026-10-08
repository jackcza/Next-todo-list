-- AlterTable
ALTER TABLE "User" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

-- Backfill: 10 points for every task that already has a completion time
UPDATE "User" u
SET "points" = 10 * (SELECT COUNT(*) FROM "Todo" t WHERE t."userId" = u."id" AND t."doneAt" IS NOT NULL);
