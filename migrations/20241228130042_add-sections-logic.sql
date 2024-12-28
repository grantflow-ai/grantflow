-- Create enum type "researchaspectenum"
CREATE TYPE "researchaspectenum" AS ENUM ('BACKGROUND_CONTEXT', 'FEASIBILITY', 'HYPOTHESIS', 'IMPACT', 'MILESTONES_AND_TIMELINE', 'NOVELTY_AND_INNOVATION', 'PRELIMINARY_DATA', 'RATIONALE', 'SCIENTIFIC_INFRASTRUCTURE', 'SPECIFIC_AIMS', 'TEAM_EXCELLENCE');
-- Modify "application_vectors" table
ALTER TABLE "application_vectors" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Drop index "ix_funding_organizations_name" from table: "funding_organizations"
DROP INDEX "ix_funding_organizations_name";
-- Modify "funding_organizations" table
ALTER TABLE "funding_organizations" DROP COLUMN "logo_url", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD CONSTRAINT "funding_organizations_name_key" UNIQUE ("name");
-- Create enum type "grantsectionenum"
CREATE TYPE "grantsectionenum" AS ENUM ('EXECUTIVE_SUMMARY', 'SIGNIFICANCE', 'INNOVATION', 'SPECIFIC_AIMS', 'WORK_PLAN', 'RESOURCES', 'EXPECTED_OUTCOMES');
-- Create "grant_formats" table
CREATE TABLE "grant_formats" (
  "markdown_template" text NOT NULL,
  "source_text" text NOT NULL,
  "version" character varying(50) NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
-- Drop index "ix_grant_cfps_code" from table: "grant_cfps"
DROP INDEX "ix_grant_cfps_code";
-- Modify "grant_cfps" table
ALTER TABLE "grant_cfps" DROP CONSTRAINT "grant_cfps_funding_organization_id_fkey", ADD COLUMN "format_id" uuid NOT NULL, ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "grant_cfps_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, ADD
 CONSTRAINT "grant_cfps_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT;
-- Create index "ix_grant_cfps_format_id" to table: "grant_cfps"
CREATE INDEX "ix_grant_cfps_format_id" ON "grant_cfps" ("format_id");
-- Create index "uq_cfp_code_funding_org" to table: "grant_cfps"
CREATE UNIQUE INDEX "uq_cfp_code_funding_org" ON "grant_cfps" ("code", "funding_organization_id");
-- Modify "workspaces" table
ALTER TABLE "workspaces" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "applications" table
ALTER TABLE "applications" DROP CONSTRAINT "applications_cfp_id_fkey", DROP CONSTRAINT "applications_workspace_id_fkey", ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "applications_cfp_id_fkey" FOREIGN KEY ("cfp_id") REFERENCES "grant_cfps" ("id") ON UPDATE NO ACTION ON DELETE CASCADE, ADD
 CONSTRAINT "applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "application_files" table
ALTER TABLE "application_files" DROP CONSTRAINT "application_files_application_id_fkey", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "application_files_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Create "grant_format_files" table
CREATE TABLE "grant_format_files" (
  "format_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(255) NOT NULL,
  "size" integer NOT NULL,
  "status" "fileindexingstatusenum" NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_format_files_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_format_files_format_id" to table: "grant_format_files"
CREATE INDEX "ix_grant_format_files_format_id" ON "grant_format_files" ("format_id");
-- Create "grant_format_vectors" table
CREATE TABLE "grant_format_vectors" (
  "format_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "element_type" character varying(50) NULL,
  "embedding" vector(256) NOT NULL,
  "page_number" integer NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("format_id", "file_id", "chunk_index"),
  CONSTRAINT "grant_format_vectors_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "grant_format_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_format_vectors_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_format_vectors_embedding_hnsw" to table: "grant_format_vectors"
CREATE INDEX "ix_grant_format_vectors_embedding_hnsw" ON "grant_format_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create "grant_sections" table
CREATE TABLE "grant_sections" (
  "content_guidelines" text NULL,
  "guiding_questions" character varying(255)[] NOT NULL,
  "form_json_schema" json NOT NULL,
  "is_required" boolean NOT NULL,
  "section_type" "grantsectionenum" NOT NULL,
  "min_words" integer NULL,
  "max_words" integer NULL,
  "format_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_sections_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_sections_format_id" to table: "grant_sections"
CREATE INDEX "ix_grant_sections_format_id" ON "grant_sections" ("format_id");
-- Modify "research_aims" table
ALTER TABLE "research_aims" DROP CONSTRAINT "research_aims_application_id_fkey", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "research_aims_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "research_tasks" table
ALTER TABLE "research_tasks" DROP CONSTRAINT "research_tasks_aim_id_fkey", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "research_tasks_aim_id_fkey" FOREIGN KEY ("aim_id") REFERENCES "research_aims" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Create "research_aspects" table
CREATE TABLE "research_aspects" (
  "type" "researchaspectenum" NOT NULL,
  "summary_text" text NOT NULL,
  "base_weight" double precision NOT NULL,
  "facets" character varying(255)[] NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
-- Create "section_aspects" table
CREATE TABLE "section_aspects" (
  "section_id" uuid NOT NULL,
  "aspect_id" uuid NOT NULL,
  "weight" double precision NULL,
  "ordering" integer NOT NULL,
  "constraints" json NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("section_id", "aspect_id"),
  CONSTRAINT "section_aspects_aspect_id_fkey" FOREIGN KEY ("aspect_id") REFERENCES "research_aspects" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "section_aspects_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "grant_sections" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Modify "text_generation_results" table
ALTER TABLE "text_generation_results" DROP CONSTRAINT "text_generation_results_application_id_fkey", ALTER COLUMN "section_id" TYPE character varying(128), ALTER COLUMN "section_type" TYPE character varying(128), ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "text_generation_results_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "workspace_users" table
ALTER TABLE "workspace_users" DROP CONSTRAINT "workspace_users_workspace_id_fkey", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD
 CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
