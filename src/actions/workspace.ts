"use server";

import { getServerClient } from "@/utils/supabase/server";
import { handleServerError } from "@/utils/server-side";

/**
 * Create a workspace with the given name and description.
 * @param name - The name of the workspace.
 * @param description - The description of the workspace.
 * @param logoUrl - The URL of the workspace logo.
 * @returns The created workspace object.
 */
export async function createWorkspace({
	name,
	description,
	logoUrl,
}: {
	name: string;
	description: string;
	logoUrl: string;
}) {
	const supabase = await getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return handleServerError(new Error("User is not logged in"));
	}

	const client = supabase.from("workspaces");
	const { error: workspaceCreateErr } = await client
		.insert({
			name,
			description: description || null,
			logo_url: logoUrl || null,
		})
		.select("id")
		.single();

	if (workspaceCreateErr) {
		return handleServerError(workspaceCreateErr, {
			message: "Failed to create workspace",
			fallback: "Failed to create workspace",
		});
	}
}
