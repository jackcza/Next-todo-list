-- AlterTable
ALTER TABLE "User" ADD COLUMN "timeZone" TEXT;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "remindedFor" TEXT;

-- Marking a reminder as sent changes nothing a device shows, so it shouldn't make every device re-download the task.
CREATE OR REPLACE FUNCTION "todo_bump_version"() RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW) - 'remindedFor' - 'updatedAt' - 'version') IS DISTINCT FROM
     (to_jsonb(OLD) - 'remindedFor' - 'updatedAt' - 'version') THEN
    NEW."version" := nextval(pg_get_serial_sequence('"Todo"', 'version'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
