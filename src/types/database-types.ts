import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "gen/database-types";

export type DatabaseClient = SupabaseClient<Database, "public", Database["public"]>;
export type GrantCFP = Database["public"]["Tables"]["grant_cfps"]["Row"];
export type GrantWizardSection = Database["public"]["Tables"]["grant_wizard_sections"]["Row"];
export type GrantApplicationQuestion = Database["public"]["Tables"]["grant_application_questions"]["Row"];
export type GrantApplicationAnswer = Database["public"]["Tables"]["grant_application_answers"]["Row"];
