-- Modify "text_generation_results" table
ALTER TABLE "text_generation_results" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "research_aims" table
ALTER TABLE "research_aims" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "application_vectors" table
ALTER TABLE "application_vectors" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "applications" table
ALTER TABLE "applications" ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Create enum type "grantsectionenum"
CREATE TYPE "grantsectionenum" AS ENUM ('EXECUTIVE_SUMMARY', 'SIGNIFICANCE', 'INNOVATION', 'SPECIFIC_AIMS', 'WORK_PLAN', 'RESOURCES', 'EXPECTED_OUTCOMES');
-- Drop index "ix_grant_cfps_code" from table: "grant_cfps"
DROP INDEX "ix_grant_cfps_code";
-- Modify "grant_cfps" table
ALTER TABLE "grant_cfps" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Create index "uq_cfp_code_funding_org" to table: "grant_cfps"
CREATE UNIQUE INDEX "uq_cfp_code_funding_org" ON "grant_cfps" ("code", "funding_organization_id");
-- Modify "application_files" table
ALTER TABLE "application_files" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "research_tasks" table
ALTER TABLE "research_tasks" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Drop index "ix_funding_organizations_name" from table: "funding_organizations"
DROP INDEX "ix_funding_organizations_name";
-- Modify "funding_organizations" table
ALTER TABLE "funding_organizations" DROP COLUMN "logo_url", ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL, ADD CONSTRAINT "funding_organizations_name_key" UNIQUE ("name");
-- Modify "workspace_users" table
ALTER TABLE "workspace_users" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Modify "workspaces" table
ALTER TABLE "workspaces" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(), ADD COLUMN "updated_at" timestamptz NOT NULL;
-- Create "grant_formats" table
CREATE TABLE "grant_formats" (
  "markdown_template" text NOT NULL,
  "source_text" text NOT NULL,
  "version" character varying(50) NOT NULL,
  "cfp_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_formats_cfp_id_fkey" FOREIGN KEY ("cfp_id") REFERENCES "grant_cfps" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "ix_grant_formats_cfp_id" to table: "grant_formats"
CREATE INDEX "ix_grant_formats_cfp_id" ON "grant_formats" ("cfp_id");
-- Create "grant_format_vectors" table
CREATE TABLE "grant_format_vectors" (
  "format_id" uuid NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "element_type" character varying(50) NULL,
  "embedding" vector(256) NOT NULL,
  "page_number" integer NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("format_id", "chunk_index"),
  CONSTRAINT "grant_format_vectors_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_format_vectors_embedding_hnsw" to table: "grant_format_vectors"
CREATE INDEX "ix_grant_format_vectors_embedding_hnsw" ON "grant_format_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create "grant_sections" table
CREATE TABLE "grant_sections" (
  "content_guidelines" text NULL,
  "guiding_questions" character varying[] NOT NULL,
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
  CONSTRAINT "grant_sections_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "grant_formats" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "ix_grant_sections_format_id" to table: "grant_sections"
CREATE INDEX "ix_grant_sections_format_id" ON "grant_sections" ("format_id");
-- Create "research_aspects" table
CREATE TABLE "research_aspects" (
  "summary_text" text NOT NULL,
  "base_weight" double precision NOT NULL,
  "facets" character varying[] NOT NULL,
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
