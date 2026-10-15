-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "recurrenceId" TEXT,
ADD COLUMN "repeat" TEXT;

-- CreateTable
CREATE TABLE "Recurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "days" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "location" TEXT,
    "time" TEXT,
    "generatedThrough" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recurrence_userId_idx" ON "Recurrence"("userId");

-- CreateIndex
CREATE INDEX "Todo_recurrenceId_date_idx" ON "Todo"("recurrenceId", "date");

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "Recurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
