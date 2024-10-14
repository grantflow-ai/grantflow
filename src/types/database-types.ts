import type { SupabaseClient, User as AuthUser } from "@supabase/supabase-js";

import type { Database } from "gen/database-types";

export type DatabaseClient = SupabaseClient<Database, "public", Database["public"]>;

export type User = Database["public"]["Tables"]["app_users"]["Row"] & AuthUser;
export type UserRole = Database["public"]["Tables"]["workspace_users"]["Row"]["role"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type FundingOrganization = Database["public"]["Tables"]["funding_organizations"]["Row"];
export type GrantCFP = Database["public"]["Tables"]["grant_cfps"]["Row"];
export type GrantApplication = Database["public"]["Tables"]["grant_applications"]["Row"];
export type ResearchAim = Database["public"]["Tables"]["research_aims"]["Row"];
export type ResearchTask = Database["public"]["Tables"]["research_tasks"]["Row"];
