CREATE TYPE "public"."application_section" AS ENUM('significance-and-innovation', 'research-plan');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"section" "application_section" NOT NULL,
	"files" json
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_files" ADD CONSTRAINT "application_files_application_id_grant_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."grant_applications"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "grant_applications" DROP COLUMN IF EXISTS "is_resubmission";--> statement-breakpoint
ALTER TABLE "research_aims" DROP COLUMN IF EXISTS "files";--> statement-breakpoint
ALTER TABLE "research_innovations" DROP COLUMN IF EXISTS "files";--> statement-breakpoint
ALTER TABLE "research_significances" DROP COLUMN IF EXISTS "files";--> statement-breakpoint
ALTER TABLE "research_tasks" DROP COLUMN IF EXISTS "files";