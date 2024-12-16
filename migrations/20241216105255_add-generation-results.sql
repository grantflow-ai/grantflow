-- Modify "application_drafts" table
ALTER TABLE "application_drafts" DROP COLUMN "created_at", DROP COLUMN "duration", ALTER COLUMN "text" DROP NOT NULL, ADD COLUMN "completed_at" timestamptz NULL;
-- Create index "ix_application_drafts_completed_at" to table: "application_drafts"
CREATE INDEX "ix_application_drafts_completed_at" ON "application_drafts" ("completed_at");
-- Modify "research_aims" table
ALTER TABLE "research_aims" ADD COLUMN "relations" character varying[] NULL;
-- Modify "research_tasks" table
ALTER TABLE "research_tasks" ADD COLUMN "relations" character varying[] NULL;
-- Create "text_generation_results" table
CREATE TABLE "text_generation_results" (
  "id" uuid NOT NULL,
  "content" text NOT NULL,
  "generation_duration" integer NULL,
  "number_of_api_calls" integer NOT NULL,
  "section_id" character varying NULL,
  "section_type" character varying NOT NULL,
  "application_draft_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "text_generation_results_application_draft_id_fkey" FOREIGN KEY ("application_draft_id") REFERENCES "application_drafts" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
