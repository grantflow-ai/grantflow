-- Create enum type "userroleenum"
CREATE TYPE "userroleenum" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
-- Create "funding_organizations" table
CREATE TABLE "funding_organizations" (
  "id" uuid NOT NULL,
  "logo_url" text NULL,
  "name" character varying(255) NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "ix_funding_organizations_name" to table: "funding_organizations"
CREATE INDEX "ix_funding_organizations_name" ON "funding_organizations" ("name");
-- Create "grant_cfps" table
CREATE TABLE "grant_cfps" (
  "id" uuid NOT NULL,
  "allow_clinical_trials" boolean NOT NULL,
  "allow_resubmissions" boolean NOT NULL,
  "category" character varying(255) NULL,
  "code" character varying(255) NOT NULL,
  "description" text NULL,
  "title" character varying(255) NOT NULL,
  "url" text NULL,
  "funding_organization_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_cfps_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "ix_grant_cfps_code" to table: "grant_cfps"
CREATE INDEX "ix_grant_cfps_code" ON "grant_cfps" ("code");
-- Create "workspaces" table
CREATE TABLE "workspaces" (
  "id" uuid NOT NULL,
  "description" text NULL,
  "logo_url" text NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "ix_workspaces_name" to table: "workspaces"
CREATE INDEX "ix_workspaces_name" ON "workspaces" ("name");
-- Create "grant_applications" table
CREATE TABLE "grant_applications" (
  "id" uuid NOT NULL,
  "title" character varying(255) NOT NULL,
  "significance" text NULL,
  "innovation" text NULL,
  "workspace_id" uuid NOT NULL,
  "cfp_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_applications_cfp_id_fkey" FOREIGN KEY ("cfp_id") REFERENCES "grant_cfps" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "grant_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "application_drafts" table
CREATE TABLE "application_drafts" (
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "duration" integer NULL,
  "text" text NOT NULL,
  "application_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "application_drafts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "application_files" table
CREATE TABLE "application_files" (
  "id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(255) NOT NULL,
  "size" integer NOT NULL,
  "application_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "application_files_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "application_vectors" table
CREATE TABLE "application_vectors" (
  "application_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "element_type" character varying(50) NULL,
  "embedding" vector(256) NOT NULL,
  "page_number" integer NULL,
  PRIMARY KEY ("application_id", "file_id", "chunk_index"),
  CONSTRAINT "application_vectors_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "application_vectors_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "application_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_application_vectors_embedding_hnsw" to table: "application_vectors"
CREATE INDEX "ix_application_vectors_embedding_hnsw" ON "application_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create "research_aims" table
CREATE TABLE "research_aims" (
  "id" uuid NOT NULL,
  "aim_number" integer NOT NULL,
  "description" text NOT NULL,
  "relations" text[] NOT NULL,
  "requires_clinical_trials" boolean NOT NULL,
  "title" character varying(255) NOT NULL,
  "application_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "research_aims_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "research_tasks" table
CREATE TABLE "research_tasks" (
  "id" uuid NOT NULL,
  "description" text NOT NULL,
  "relations" text[] NOT NULL,
  "task_number" character varying(4) NOT NULL,
  "title" character varying(255) NOT NULL,
  "aim_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "research_tasks_aim_id_fkey" FOREIGN KEY ("aim_id") REFERENCES "research_aims" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "users" table
CREATE TABLE "users" (
  "id" uuid NOT NULL,
  "display_name" character varying(255) NULL,
  "email" character varying(255) NOT NULL,
  "photo_url" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "users_email_key" UNIQUE ("email")
);
-- Create "workspace_users" table
CREATE TABLE "workspace_users" (
  "role" "userroleenum" NOT NULL,
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  PRIMARY KEY ("workspace_id", "user_id"),
  CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
