-- Create index "ix_application_files_application_id" to table: "application_files"
CREATE INDEX "ix_application_files_application_id" ON "application_files" ("application_id");
-- Create index "ix_applications_cfp_id" to table: "applications"
CREATE INDEX "ix_applications_cfp_id" ON "applications" ("cfp_id");
-- Create index "ix_applications_workspace_id" to table: "applications"
CREATE INDEX "ix_applications_workspace_id" ON "applications" ("workspace_id");
-- Create index "ix_grant_cfps_funding_organization_id" to table: "grant_cfps"
CREATE INDEX "ix_grant_cfps_funding_organization_id" ON "grant_cfps" ("funding_organization_id");
-- Modify "research_aims" table
ALTER TABLE "research_aims" ALTER COLUMN "description" DROP NOT NULL;
-- Create index "ix_research_aims_application_id" to table: "research_aims"
CREATE INDEX "ix_research_aims_application_id" ON "research_aims" ("application_id");
-- Modify "research_tasks" table
ALTER TABLE "research_tasks" ALTER COLUMN "description" DROP NOT NULL;
-- Create index "ix_research_tasks_aim_id" to table: "research_tasks"
CREATE INDEX "ix_research_tasks_aim_id" ON "research_tasks" ("aim_id");
-- Create index "ix_text_generation_results_application_id" to table: "text_generation_results"
CREATE INDEX "ix_text_generation_results_application_id" ON "text_generation_results" ("application_id");
