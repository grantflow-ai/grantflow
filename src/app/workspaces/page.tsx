import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { getDatabaseClient } from "db/connection";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { workspaces, workspaceUsers } from "db/schema";
import { handleServerError } from "@/utils/server-side";
import { PagePath } from "@/enums";

export default async function WorkspacesListPage() {
	const session = await auth();

	if (!session?.user) {
		return handleServerError(new Error("User not authenticated"), { redirect: PagePath.SIGNIN });
	}

	const db = getDatabaseClient();

	const userWorkspaces = await db
		.select({
			description: workspaces.description,
			logoUrl: workspaces.logoUrl,
			name: workspaces.name,
			role: workspaceUsers.role,
			workspaceId: workspaceUsers.workspaceId,
		})
		.from(workspaceUsers)
		.leftJoin(workspaces, eq(workspaceUsers.workspaceId, workspaces.id))
		.where(eq(workspaceUsers.userId, session.user.id));

	return (
		<div className="w-full h-full">
			<div className="py-4">
				<CreateWorkspaceModal />
			</div>
			<div className="my-6 space-y-8">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
					{userWorkspaces.map((data) => (
						<WorkspaceCard key={data.workspaceId} {...data} />
					))}
				</div>
			</div>
		</div>
	);
}
