import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";

import type { Database } from "gen/database-types";

export type DatabaseClient = SupabaseClient<Database, "public", Database["public"]>;

export type User = Database["public"]["Tables"]["app_users"]["Row"] & AuthUser;
export type UserRole = Database["public"]["Tables"]["workspace_users"]["Row"]["role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type GrantCFP = Database["public"]["Tables"]["grant_cfps"]["Row"];
export type GrantWizardSection = Database["public"]["Tables"]["grant_wizard_sections"]["Row"];
export type GrantApplicationQuestion = Database["public"]["Tables"]["grant_application_questions"]["Row"];
export type GrantApplicationAnswer = Database["public"]["Tables"]["grant_application_answers"]["Row"];
export type ApplicationDraft = Database["public"]["Tables"]["application_drafts"]["Row"];
export type ApplicationDraftCompletionPercentage = Database["public"]["Views"]["application_drafts_completion"]["Row"];
export type ResearchAim = Database["public"]["Tables"]["research_aims"]["Row"];
export type ResearchTask = Database["public"]["Tables"]["research_tasks"]["Row"];
