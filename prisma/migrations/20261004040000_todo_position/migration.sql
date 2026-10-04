-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing todos in creation order per user
UPDATE "Todo" AS t
SET "position" = ranked.rn
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") - 1 AS rn
    FROM "Todo"
) AS ranked
WHERE t."id" = ranked."id";
