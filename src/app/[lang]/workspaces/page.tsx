import { PagePath } from "@/enums";
import { getLocale, type SupportedLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { getDatabaseClient } from "db/connection";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { workspaceUsers, workspaces } from "db/schema";

export default async function WorkspacesListPage({
	params: { lang },
}: {
	params: {
		lang: SupportedLocale;
	};
}) {
	const session = await auth();

	if (!session?.user?.id) {
		return handleServerError(new Error("Failed to fetch user"), {
			redirect: PagePath.SIGNIN,
		});
	}

	const db = await getDatabaseClient();

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

	const locales = await getLocale(lang);

	return (
		<div className="p-5">
			<div className="py-4">
				<CreateWorkspaceModal locales={locales} />
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
