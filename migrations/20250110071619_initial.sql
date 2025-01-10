-- Create enum type "userroleenum"
CREATE TYPE "userroleenum" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
-- Create enum type "fileindexingstatusenum"
CREATE TYPE "fileindexingstatusenum" AS ENUM ('INDEXING', 'FINISHED', 'FAILED');
-- Create "workspaces" table
CREATE TABLE "workspaces" (
  "description" text NULL,
  "logo_url" text NULL,
  "name" text NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "ix_workspaces_created_at" to table: "workspaces"
CREATE INDEX "ix_workspaces_created_at" ON "workspaces" ("created_at");
-- Create index "ix_workspaces_name" to table: "workspaces"
CREATE INDEX "ix_workspaces_name" ON "workspaces" ("name");
-- Create "grant_applications" table
CREATE TABLE "grant_applications" (
  "completed_at" timestamptz NULL,
  "research_objectives" json NULL,
  "text_generation_results" json NULL,
  "title" character varying(255) NOT NULL,
  "workspace_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_applications_completed_at" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_completed_at" ON "grant_applications" ("completed_at");
-- Create index "ix_grant_applications_created_at" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_created_at" ON "grant_applications" ("created_at");
-- Create index "ix_grant_applications_workspace_id" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_workspace_id" ON "grant_applications" ("workspace_id");
-- Create "rag_files" table
CREATE TABLE "rag_files" (
  "filename" character varying(255) NOT NULL,
  "indexing_status" "fileindexingstatusenum" NOT NULL,
  "mime_type" character varying(255) NOT NULL,
  "size" bigint NOT NULL,
  "text_content" text NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "check_positive_file_size" CHECK (size >= 0)
);
-- Create index "ix_rag_files_created_at" to table: "rag_files"
CREATE INDEX "ix_rag_files_created_at" ON "rag_files" ("created_at");
-- Create index "ix_rag_files_indexing_status" to table: "rag_files"
CREATE INDEX "ix_rag_files_indexing_status" ON "rag_files" ("indexing_status");
-- Create "grant_application_files" table
CREATE TABLE "grant_application_files" (
  "rag_file_id" uuid NOT NULL,
  "grant_application_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("rag_file_id", "grant_application_id"),
  CONSTRAINT "grant_application_files_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_application_files_rag_file_id_fkey" FOREIGN KEY ("rag_file_id") REFERENCES "rag_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_application_files_created_at" to table: "grant_application_files"
CREATE INDEX "ix_grant_application_files_created_at" ON "grant_application_files" ("created_at");
-- Create "funding_organizations" table
CREATE TABLE "funding_organizations" (
  "full_name" character varying(255) NOT NULL,
  "abbreviation" character varying(64) NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "funding_organizations_full_name_key" UNIQUE ("full_name")
);
-- Create index "ix_funding_organizations_abbreviation" to table: "funding_organizations"
CREATE INDEX "ix_funding_organizations_abbreviation" ON "funding_organizations" ("abbreviation");
-- Create index "ix_funding_organizations_created_at" to table: "funding_organizations"
CREATE INDEX "ix_funding_organizations_created_at" ON "funding_organizations" ("created_at");
-- Create "grant_templates" table
CREATE TABLE "grant_templates" (
  "grant_sections" json NOT NULL,
  "name" character varying(255) NOT NULL,
  "template" text NOT NULL,
  "grant_application_id" uuid NOT NULL,
  "funding_organization_id" uuid NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_templates_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE NO ACTION ON DELETE SET NULL,
  CONSTRAINT "grant_templates_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_templates_created_at" to table: "grant_templates"
CREATE INDEX "ix_grant_templates_created_at" ON "grant_templates" ("created_at");
-- Create index "ix_grant_templates_grant_application_id" to table: "grant_templates"
CREATE INDEX "ix_grant_templates_grant_application_id" ON "grant_templates" ("grant_application_id");
-- Create "organization_files" table
CREATE TABLE "organization_files" (
  "rag_file_id" uuid NOT NULL,
  "funding_organization_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("rag_file_id", "funding_organization_id"),
  CONSTRAINT "organization_files_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "organization_files_rag_file_id_fkey" FOREIGN KEY ("rag_file_id") REFERENCES "rag_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_organization_files_created_at" to table: "organization_files"
CREATE INDEX "ix_organization_files_created_at" ON "organization_files" ("created_at");
-- Create "text_vectors" table
CREATE TABLE "text_vectors" (
  "chunk" json NOT NULL,
  "embedding" vector(256) NOT NULL,
  "rag_file_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "text_vectors_rag_file_id_fkey" FOREIGN KEY ("rag_file_id") REFERENCES "rag_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_text_vectors_embedding" to table: "text_vectors"
CREATE INDEX "idx_text_vectors_embedding" ON "text_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create index "ix_text_vectors_created_at" to table: "text_vectors"
CREATE INDEX "ix_text_vectors_created_at" ON "text_vectors" ("created_at");
-- Create index "ix_text_vectors_rag_file_id" to table: "text_vectors"
CREATE INDEX "ix_text_vectors_rag_file_id" ON "text_vectors" ("rag_file_id");
-- Create "workspace_users" table
CREATE TABLE "workspace_users" (
  "firebase_uid" character varying(128) NOT NULL,
  "role" "userroleenum" NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("firebase_uid", "workspace_id"),
  CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_workspace_users_created_at" to table: "workspace_users"
CREATE INDEX "ix_workspace_users_created_at" ON "workspace_users" ("created_at");
