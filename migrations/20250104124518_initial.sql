-- Create enum type "fileindexingstatusenum"
CREATE TYPE "fileindexingstatusenum" AS ENUM ('INDEXING', 'FINISHED', 'FAILED');
-- Create enum type "grantsectionenum"
CREATE TYPE "grantsectionenum" AS ENUM ('FRONT_MATTER', 'ABSTRACT', 'LAY_SUMMARY', 'PROJECT_NARRATIVE', 'SPECIFIC_AIMS', 'SIGNIFICANCE', 'INNOVATION', 'APPROACH', 'METHODS', 'TIMELINE', 'PRIOR_RESULTS', 'FEASIBILITY', 'LIMITATIONS', 'FACILITIES', 'EQUIPMENT', 'ENVIRONMENT', 'DATA_MANAGEMENT', 'RESOURCE_SHARING', 'PERSONNEL', 'BIOGRAPHICAL', 'EXPERTISE', 'BUDGET', 'BUDGET_JUSTIFICATION', 'CURRENT_PENDING', 'OUTCOMES', 'BROADER_IMPACTS', 'DISSEMINATION', 'HUMAN_SUBJECTS', 'VERTEBRATE_ANIMALS', 'SAFETY', 'ETHICS', 'REFERENCES', 'LETTERS_OF_SUPPORT', 'EVALUATION_PLAN', 'SUSTAINABILITY', 'TRAINING_PLAN', 'MENTORING_PLAN');
-- Create enum type "contenttopicenum"
CREATE TYPE "contenttopicenum" AS ENUM ('STATE_OF_ART', 'PROBLEM', 'MOTIVATION', 'NOVELTY', 'ADVANCEMENT', 'DISRUPTION', 'METHODOLOGY', 'DESIGN', 'VALIDATION', 'ANALYSIS', 'EXPERTISE', 'RESOURCES', 'TRACK_RECORD', 'PRELIMINARY', 'WORKPLAN', 'TIMELINE', 'MILESTONES', 'COORDINATION', 'CHALLENGES', 'MITIGATION', 'ALTERNATIVES', 'OUTCOMES', 'DELIVERABLES', 'BENEFITS', 'DISSEMINATION', 'LONGEVITY', 'SCALABILITY', 'ADOPTION', 'ETHICS', 'SAFETY', 'STANDARDS', 'FINANCIAL', 'EQUIPMENT', 'DATA', 'MONITORING', 'EVALUATION', 'REPORTING');
-- Create enum type "userroleenum"
CREATE TYPE "userroleenum" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
-- Create "funding_organizations" table
CREATE TABLE "funding_organizations" (
  "name" character varying(255) NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "funding_organizations_name_key" UNIQUE ("name")
);
-- Create "grant_templates" table
CREATE TABLE "grant_templates" (
  "name" character varying(255) NOT NULL,
  "template" text NOT NULL,
  "funding_organization_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_templates_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_grant_template_name_org" to table: "grant_templates"
CREATE UNIQUE INDEX "idx_grant_template_name_org" ON "grant_templates" ("name", "funding_organization_id");
-- Create index "ix_grant_templates_funding_organization_id" to table: "grant_templates"
CREATE INDEX "ix_grant_templates_funding_organization_id" ON "grant_templates" ("funding_organization_id");
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
-- Create index "ix_workspaces_name" to table: "workspaces"
CREATE INDEX "ix_workspaces_name" ON "workspaces" ("name");
-- Create "grant_applications" table
CREATE TABLE "grant_applications" (
  "title" character varying(255) NOT NULL,
  "significance" text NULL,
  "innovation" text NULL,
  "completed_at" timestamptz NULL,
  "text" text NULL,
  "workspace_id" uuid NOT NULL,
  "funding_organization_id" uuid NOT NULL,
  "grant_template_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_applications_funding_organization_id_fkey" FOREIGN KEY ("funding_organization_id") REFERENCES "funding_organizations" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_applications_grant_template_id_fkey" FOREIGN KEY ("grant_template_id") REFERENCES "grant_templates" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_applications_completed_at" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_completed_at" ON "grant_applications" ("completed_at");
-- Create index "ix_grant_applications_funding_organization_id" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_funding_organization_id" ON "grant_applications" ("funding_organization_id");
-- Create index "ix_grant_applications_grant_template_id" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_grant_template_id" ON "grant_applications" ("grant_template_id");
-- Create index "ix_grant_applications_workspace_id" to table: "grant_applications"
CREATE INDEX "ix_grant_applications_workspace_id" ON "grant_applications" ("workspace_id");
-- Create "generation_results" table
CREATE TABLE "generation_results" (
  "billable_characters_used" integer NOT NULL,
  "content" text NOT NULL,
  "generation_duration" integer NULL,
  "number_of_api_calls" integer NOT NULL,
  "section_id" character varying(128) NULL,
  "section_type" character varying(128) NOT NULL,
  "tokens_used" integer NULL,
  "grant_application_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "generation_results_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_generation_results_grant_application_id" to table: "generation_results"
CREATE INDEX "ix_generation_results_grant_application_id" ON "generation_results" ("grant_application_id");
-- Create "grant_application_files" table
CREATE TABLE "grant_application_files" (
  "grant_application_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(255) NOT NULL,
  "size" integer NOT NULL,
  "text_content" text NULL,
  "status" "fileindexingstatusenum" NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_application_files_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_application_files_grant_application_id" to table: "grant_application_files"
CREATE INDEX "ix_grant_application_files_grant_application_id" ON "grant_application_files" ("grant_application_id");
-- Create index "ix_grant_application_files_status" to table: "grant_application_files"
CREATE INDEX "ix_grant_application_files_status" ON "grant_application_files" ("status");
-- Create "grant_application_vectors" table
CREATE TABLE "grant_application_vectors" (
  "grant_application_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "embedding" vector(256) NOT NULL,
  "chunk" json NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("grant_application_id", "file_id", "id"),
  CONSTRAINT "grant_application_vectors_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "grant_application_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_application_vectors_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_grant_application_vectors_embedding" to table: "grant_application_vectors"
CREATE INDEX "idx_grant_application_vectors_embedding" ON "grant_application_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create "grant_sections" table
CREATE TABLE "grant_sections" (
  "search_terms" character varying(255)[] NOT NULL,
  "max_words" integer NULL,
  "min_words" integer NULL,
  "type" "grantsectionenum" NOT NULL,
  "grant_template_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_sections_grant_template_id_fkey" FOREIGN KEY ("grant_template_id") REFERENCES "grant_templates" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_sections_grant_template_id" to table: "grant_sections"
CREATE INDEX "ix_grant_sections_grant_template_id" ON "grant_sections" ("grant_template_id");
-- Create "grant_template_files" table
CREATE TABLE "grant_template_files" (
  "grant_template_id" uuid NOT NULL,
  "name" character varying(255) NOT NULL,
  "type" character varying(255) NOT NULL,
  "size" integer NOT NULL,
  "text_content" text NULL,
  "status" "fileindexingstatusenum" NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "grant_template_files_grant_template_id_fkey" FOREIGN KEY ("grant_template_id") REFERENCES "grant_templates" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_grant_template_files_grant_template_id" to table: "grant_template_files"
CREATE INDEX "ix_grant_template_files_grant_template_id" ON "grant_template_files" ("grant_template_id");
-- Create index "ix_grant_template_files_status" to table: "grant_template_files"
CREATE INDEX "ix_grant_template_files_status" ON "grant_template_files" ("status");
-- Create "grant_template_vectors" table
CREATE TABLE "grant_template_vectors" (
  "template_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "embedding" vector(256) NOT NULL,
  "chunk" json NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("template_id", "file_id", "id"),
  CONSTRAINT "grant_template_vectors_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "grant_template_files" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "grant_template_vectors_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "grant_templates" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_grant_template_vectors_embedding" to table: "grant_template_vectors"
CREATE INDEX "idx_grant_template_vectors_embedding" ON "grant_template_vectors" USING hnsw ("embedding" vector_cosine_ops);
-- Create "research_aims" table
CREATE TABLE "research_aims" (
  "aim_number" integer NOT NULL,
  "description" text NULL,
  "preliminary_results" text NULL,
  "risks_and_alternatives" text NULL,
  "requires_clinical_trials" boolean NOT NULL,
  "title" character varying(255) NOT NULL,
  "grant_application_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "research_aims_grant_application_id_fkey" FOREIGN KEY ("grant_application_id") REFERENCES "grant_applications" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_research_aims_grant_application_id" to table: "research_aims"
CREATE INDEX "ix_research_aims_grant_application_id" ON "research_aims" ("grant_application_id");
-- Create "research_tasks" table
CREATE TABLE "research_tasks" (
  "description" text NULL,
  "task_number" integer NOT NULL,
  "title" character varying(255) NOT NULL,
  "aim_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "research_tasks_aim_id_fkey" FOREIGN KEY ("aim_id") REFERENCES "research_aims" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "ix_research_tasks_aim_id" to table: "research_tasks"
CREATE INDEX "ix_research_tasks_aim_id" ON "research_tasks" ("aim_id");
-- Create "section_topics" table
CREATE TABLE "section_topics" (
  "search_terms" character varying(255)[] NOT NULL,
  "topic" "contenttopicenum" NOT NULL,
  "weight" double precision NULL,
  "grant_section_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("topic", "grant_section_id"),
  CONSTRAINT "section_topics_grant_section_id_fkey" FOREIGN KEY ("grant_section_id") REFERENCES "grant_sections" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create "workspace_users" table
CREATE TABLE "workspace_users" (
  "role" "userroleenum" NOT NULL,
  "firebase_uid" character varying(128) NOT NULL,
  "workspace_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("firebase_uid", "workspace_id"),
  CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
