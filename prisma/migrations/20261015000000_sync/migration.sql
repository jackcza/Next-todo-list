-- AlterTable: existing rows get numbered from the new sequence
ALTER TABLE "Todo" ADD COLUMN "version" BIGSERIAL NOT NULL;

-- Every update takes a fresh number, so a device can ask for "everything after the version I last saw".
CREATE FUNCTION "todo_bump_version"() RETURNS trigger AS $$
BEGIN
  NEW."version" := nextval(pg_get_serial_sequence('"Todo"', 'version'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "todo_bump_version" BEFORE UPDATE ON "Todo"
FOR EACH ROW EXECUTE FUNCTION "todo_bump_version"();

-- CreateIndex
CREATE INDEX "Todo_userId_version_idx" ON "Todo"("userId", "version");

-- CreateTable
CREATE TABLE "AppliedOp" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppliedOp_pkey" PRIMARY KEY ("userId","id")
);

-- CreateIndex
CREATE INDEX "AppliedOp_createdAt_idx" ON "AppliedOp"("createdAt");

-- AddForeignKey
ALTER TABLE "AppliedOp" ADD CONSTRAINT "AppliedOp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
