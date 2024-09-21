import { getServerClient } from "@/utils/supabase/server";

/**
 * Upsert a workspace with the given name and description.
 * @param name - The name of the workspace.
 * @param description - The description of the workspace.
 * @returns The created workspace object.
 */
export async function createWorkspace(name: string, description?: string) {
	const supabase = getServerClient();
	const client = supabase.from("workspaces");
	return client.insert({ name, description: description ?? null });
}
