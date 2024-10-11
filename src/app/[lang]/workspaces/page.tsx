import { CreateWorkspaceModal } from "@/components/organization/create-workspace-modal";
import { PagePath } from "@/enums";
import { type SupportedLocale, getLocale } from "@/i18n";
import type { Workspace } from "@/types/database-types";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";

export default async function OrganizationDetailPage({
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

	const workspaces = userWorkspaces.map((workspaceUser) => workspaceUser.workspace).filter(Boolean) as Workspace[];
	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto px-4 py-8" data-testid="workspace-view-page">
			<Card data-testid="workspace-view-workspaces-section">
				<CardHeader>
					<CardTitle>{locales.workspaceListView.title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{workspaces.map((workspace) => (
							<Link
								key={workspace.id}
								href={`/${lang}/workspace/${workspace.id}`}
								className="block"
								data-testid={`workspace-link-${workspace.id}`}
							>
								<Card className="h-full hover:shadow-md transition-shadow">
									<CardHeader>
										<CardTitle className="text-lg">{workspace.name}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground">{workspace.description}</p>
									</CardContent>
								</Card>
							</Link>
						))}
						<CreateWorkspaceModal locales={locales} />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
