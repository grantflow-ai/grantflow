"use server";

import { handleServerError } from "@/utils/server-side";
import { getDatabaseClient } from "db/connection";
import { workspaces } from "db/schema";

/**
 * Create a workspace with the given name and description.
 * @param name - The name of the workspace.
 * @param description - The description of the workspace.
 * @returns The created workspace object.
 */
export async function createWorkspace({ name, description }: { name: string; description: string }) {
	try {
		// TODO run in transaction and create workspace user
		const db = getDatabaseClient();
		await db
			.insert(workspaces)
			.values({
				name,
				description: description || null,
			})
			.returning({ workspaceId: workspaces.id });
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to create workspace",
			fallback: "Failed to create workspace",
		});
	}
}
