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
	logoUrl,
}: {
	description?: string;
	name: string;
	logoUrl?: string;
}) {
	const supabase = await getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return handleServerError(new Error("User is not logged in"));
	}

	const client = supabase.from("workspaces");
	const { data, error: workspaceCreateErr } = await client
		.insert({
			name,
			description,
			logoUrl,
		})
		.select("id")
		.single();

	if (workspaceCreateErr) {
		return handleServerError(workspaceCreateErr, {
			message: "Failed to create workspace",
			fallback: "Failed to create workspace",
		});
	}

	await supabase.from("workspace_users").insert({
		workspace_id: data.id,
		user_id: user.id,
		role: "owner",
	});
}
