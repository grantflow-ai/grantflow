import { PagePath } from "@/enums";
import { getLocale, type SupportedLocale } from "@/i18n";
import { Workspace } from "@/types/database-types";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";

export default async function WorkspacesListPage({
	params: { lang },
}: {
	params: {
		lang: SupportedLocale;
	};
}) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return handleServerError(new Error("Failed to fetch user"), {
			redirect: PagePath.AUTH,
		});
	}

	const client = supabase.from("workspace_users");
	const { data: userWorkspaces, error: userWorkspacesFetchErr } = await client
		.select(
			`
			*,
			workspace:workspaces (*)
		`,
		)
		.eq("user_id", user.id);

	if (userWorkspacesFetchErr) {
		return handleServerError(userWorkspacesFetchErr, {
			message: "Failed to fetch user workspaces",
		});
	}

	const locales = await getLocale(lang);

	return (
		<div className="p-5">
			<div className="py-4">
				<CreateWorkspaceModal locales={locales} />
			</div>
			<div className="my-6 space-y-8">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
					{userWorkspaces.map((userWorkspace) => (
						<WorkspaceCard
							key={userWorkspace.workspace_id}
							workspace={userWorkspace.workspace as Workspace}
							userRole={userWorkspace.role}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
