-- Modify "application_files" table
ALTER TABLE "application_files" DROP COLUMN "status";
-- Drop enum type "fileindexingstatusenum"
DROP TYPE "fileindexingstatusenum";
