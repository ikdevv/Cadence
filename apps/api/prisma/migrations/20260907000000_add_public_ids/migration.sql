-- AlterTable: add nullable publicId first so existing rows are not rejected.
ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
ALTER TABLE "Report" ADD COLUMN "publicId" TEXT;

-- Backfill existing rows. gen_random_uuid() is built into Postgres core
-- (>= 13), so no extension is required. Values are random and independent of
-- "id" -- not derived from it, a hash of it, or from any other column.
UPDATE "User" SET "publicId" = 'usr_' || replace(gen_random_uuid()::text, '-', '') WHERE "publicId" IS NULL;
UPDATE "Report" SET "publicId" = 'rpt_' || replace(gen_random_uuid()::text, '-', '') WHERE "publicId" IS NULL;

-- AlterTable: now that every row has a value, require it going forward.
ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "publicId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX "Report_publicId_key" ON "Report"("publicId");
