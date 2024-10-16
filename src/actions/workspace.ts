"use server";

import { handleServerError } from "@/utils/server-side";
import { getDatabaseClient } from "db/connection";
import { workspaces, workspaceUsers } from "db/schema";
import { auth } from "@/auth";
import { PagePath } from "@/enums";

/**
 * Create a workspace with the given name and description.
 * @param name - The name of the workspace.
 * @param description - The description of the workspace.
 * @returns The created workspace object.
 */
export async function createWorkspace({ name, description }: { name: string; description: string }) {
	const session = await auth();

	if (!session?.user) {
		return handleServerError(new Error("User not authenticated"), { redirect: PagePath.SIGNIN });
	}
	try {
		const db = getDatabaseClient();
		await db.transaction(async (tx) => {
			try {
				const [{ workspaceId }] = await tx
					.insert(workspaces)
					.values({
						name,
						description: description || null,
					})
					.returning({ workspaceId: workspaces.id });

				await tx.insert(workspaceUsers).values({
					userId: session.user.id,
					workspaceId,
					role: "owner",
				});
			} catch (error) {
				tx.rollback();
				throw error;
			}
		});
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to create workspace",
			fallback: "Failed to create workspace",
		});
	}
}
