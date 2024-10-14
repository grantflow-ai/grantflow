DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'member');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funding_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grant_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"cfp_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"is_resubmission" boolean DEFAULT false NOT NULL,
	"significance" text NOT NULL,
	"innovation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grant_cfps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funding_organization_id" uuid NOT NULL,
	"allow_clinical_trials" boolean DEFAULT true NOT NULL,
	"allow_resubmissions" boolean DEFAULT true NOT NULL,
	"category" varchar(255),
	"code" varchar(255) NOT NULL,
	"description" text,
	"title" varchar(255) NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mailing_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mailing_list_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "research_aims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"file_urls" text[],
	"required_clinical_trials" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "research_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aim_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"file_urls" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_users" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "workspace_users_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "unique_workspace_user" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_cfp_id_grant_cfps_id_fk" FOREIGN KEY ("cfp_id") REFERENCES "public"."grant_cfps"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grant_cfps" ADD CONSTRAINT "grant_cfps_funding_organization_id_funding_organizations_id_fk" FOREIGN KEY ("funding_organization_id") REFERENCES "public"."funding_organizations"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "research_aims" ADD CONSTRAINT "research_aims_application_id_grant_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."grant_applications"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "research_tasks" ADD CONSTRAINT "research_tasks_aim_id_research_aims_id_fk" FOREIGN KEY ("aim_id") REFERENCES "public"."research_aims"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_users_email" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_funding_organization_name" ON "funding_organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_funding_organization_deleted_at" ON "funding_organizations" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_application_grant_cfp_id" ON "grant_applications" USING btree ("cfp_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_application_deleted_at" ON "grant_applications" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_cfps_identifier" ON "grant_cfps" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_cfps_funding_organization_id" ON "grant_cfps" USING btree ("funding_organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_grant_cfps_deleted_at" ON "grant_cfps" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mailing_list_email" ON "mailing_list" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_research_aims_application_id" ON "research_aims" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_research_aims_deleted_at" ON "research_aims" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_aim_id" ON "research_tasks" USING btree ("aim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_deleted_at" ON "research_tasks" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspace_users_role" ON "workspace_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspace_users_workspace_id" ON "workspace_users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspace_users_user_id" ON "workspace_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspace_users_deleted_at" ON "workspace_users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspaces_deleted_at" ON "workspaces" USING btree ("deleted_at");