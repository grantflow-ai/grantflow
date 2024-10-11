import { type SupportedLocale, getLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import Image from "next/image";

export default async function WorkspaceDetailPage({
	params: { lang, workspaceId },
}: {
	params: {
		lang: SupportedLocale;
		workspaceId: string;
	};
}) {
	const supabase = await getServerClient();
	const client = supabase.from("workspaces");
	const { data: workspace, error } = await client.select("*").eq("id", workspaceId).single();

	if (error) {
		return handleServerError(error, { message: "Failed to fetch workspace" });
	}

	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto px-4 py-8" data-testid="workspace-view-page">
			<Card className="mb-8" data-testid="workspace-view-details-section">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{locales.workspaceDetailView.title}</CardTitle>
					{workspace.logo_url && (
						<Image
							src={workspace.logo_url}
							alt={`${workspace.name} logo`}
							width={64}
							height={64}
							className="rounded-full"
							data-testid="workspace-logo"
						/>
					)}
				</CardHeader>
				<CardContent>
					<h2 className="text-2xl font-bold mb-2" data-testid="workspace-name">
						{workspace.name}
					</h2>
					<p className="text-muted-foreground" data-testid="workspace-id">
						{workspace.id}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
