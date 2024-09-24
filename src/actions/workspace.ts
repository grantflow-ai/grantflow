import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";

/**
 * Create a workspace with the given name and description.
 * @param description - The description of the workspace.
 * @param name - The name of the workspace.
 * @param organizationId - The ID of the organization.
 * @returns The created workspace object.
 */
export async function createWorkspace({
	description,
	name,
	organizationId,
}: {
	description?: string;
	name: string;
	organizationId: string;
}) {
	try {
		const supabase = getServerClient();
		const client = supabase.from("workspaces");
		return await client.insert({
			organization_id: organizationId,
			name,
			description,
		});
	} catch (error) {
		return handleServerError(error as Error, (error as Error).message);
	}
}
