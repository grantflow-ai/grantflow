ALTER TABLE "generation_results" RENAME COLUMN "data" TO "text";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_generation_results_section_type";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_generation_results_application_type_version";--> statement-breakpoint
ALTER TABLE "generation_results" DROP COLUMN IF EXISTS "version";--> statement-breakpoint
ALTER TABLE "generation_results" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
DROP TYPE "public"."generation_result_type";