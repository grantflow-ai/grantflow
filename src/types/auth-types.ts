import type { User as AuthUser } from "@supabase/supabase-js";

import type { Database } from "gen/database-types";

export type User = Database["public"]["Tables"]["app_users"]["Row"] & AuthUser;
