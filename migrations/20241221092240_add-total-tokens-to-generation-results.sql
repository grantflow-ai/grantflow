-- Modify "text_generation_results" table
ALTER TABLE "text_generation_results" ADD COLUMN "billable_characters_used" integer NULL, ADD COLUMN "tokens_used" integer NULL;
