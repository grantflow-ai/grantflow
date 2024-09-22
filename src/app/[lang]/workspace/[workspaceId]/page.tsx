import { type SupportedLocale, getLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function WorkspaceDetailPage({
	params: { lang, workspaceId },
}: {
	params: {
		lang: SupportedLocale;
		workspaceId: string;
	};
}) {
	const supabase = getServerClient();
	const client = supabase.from("workspaces");
	const { data: workspace, error: workspaceFetchErr } = await client
		.select("*")
		.eq("id", workspaceId)
		.limit(1)
		.maybeSingle();

	if (workspaceFetchErr) {
		return handleServerError(workspaceFetchErr, null);
	}

	if (!workspace) {
		return null;
	}

	const { data: grantApplications, error: grantApplicationsFetchErr } = await supabase
		.from("grant_applications")
		.select("*")
		.eq("workspace_id", workspace.id)
		.order("title", { ascending: true });

	if (grantApplicationsFetchErr) {
		return handleServerError(grantApplicationsFetchErr, null);
	}

	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto px-4 py-8" data-testid="workspace-view-page">
			<Card className="mb-8" data-testid="workspace-view-details-section">
				<CardHeader>
					<CardTitle>{locales.workspaceView.title}</CardTitle>
				</CardHeader>
				<CardContent>
					<h2 className="text-2xl font-bold mb-2" data-testid="workspace-name">
						{workspace.name}
					</h2>
					<p className="text-muted-foreground" data-testid="workspace-id">
						ID: {workspace.id}
					</p>
					{workspace.description && (
						<p className="mt-4" data-testid="workspace-description">
							{workspace.description}
						</p>
					)}
				</CardContent>
			</Card>

			<Card data-testid="workspace-view-grant-applications-section">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{locales.workspaceView.grantApplications.title}</CardTitle>
					<Button data-testid="create-grant-application-button">
						<PlusCircle className="mr-2 h-4 w-4" />
						{locales.workspaceView.grantApplications.createApplication}
					</Button>
				</CardHeader>
				<CardContent>
					{grantApplications.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{grantApplications.map((grantApplication) => (
								<Link
									key={grantApplication.id}
									href={`/${lang}/grant-application/${grantApplication.id}`}
									className="block"
									data-testid={`grant-application-link-${grantApplication.id}`}
								>
									<Card className="h-full hover:shadow-md transition-shadow">
										<CardHeader>
											<CardTitle className="text-lg flex items-center">
												<FileText className="mr-2 h-5 w-5" />
												{grantApplication.title}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground">ID: {grantApplication.id}</p>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					) : (
						<p className="text-center text-muted-foreground" data-testid="no-grant-applications-message">
							{locales.workspaceView.grantApplications.noApplications}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
