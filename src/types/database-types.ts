import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "gen/database-types";

export type DatabaseClient = SupabaseClient<Database, "public", Database["public"]>;
