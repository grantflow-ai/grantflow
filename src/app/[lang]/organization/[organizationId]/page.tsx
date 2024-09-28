import { CreateWorkspaceModal } from "@/components/organization/create-workspace-modal";
import { type SupportedLocale, getLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import Image from "next/image";
import Link from "next/link";

export default async function OrganizationDetailPage({
	params: { lang, organizationId },
}: {
	params: {
		lang: SupportedLocale;
		organizationId: string;
	};
}) {
	const supabase = await getServerClient();
	const client = supabase.from("organizations");
	const { data: organization, error: orgFetchErr } = await client
		.select("*")
		.eq("id", organizationId)
		.limit(1)
		.maybeSingle();

	if (orgFetchErr) {
		return handleServerError(orgFetchErr, null);
	}

	if (!organization) {
		return null;
	}

	const { data: workspaces, error: workspacesFetchErr } = await supabase
		.from("workspaces")
		.select("*")
		.eq("organization_id", organizationId)
		.order("name", { ascending: true });

	if (workspacesFetchErr) {
		return handleServerError(workspacesFetchErr, null);
	}

	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto px-4 py-8" data-testid="organization-view-page">
			<Card className="mb-8" data-testid="organization-view-details-section">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>{locales.organizationView.title}</CardTitle>
					{organization.logo && (
						<Image
							src={organization.logo}
							alt={`${organization.name} logo`}
							width={64}
							height={64}
							className="rounded-full"
							data-testid="organization-logo"
						/>
					)}
				</CardHeader>
				<CardContent>
					<h2 className="text-2xl font-bold mb-2" data-testid="organization-name">
						{organization.name}
					</h2>
					<p className="text-muted-foreground" data-testid="organization-id">
						{organization.id}
					</p>
				</CardContent>
			</Card>

			<Card data-testid="organization-view-workspaces-section">
				<CardHeader>
					<CardTitle>{locales.organizationView.workspaces}</CardTitle>
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
						<CreateWorkspaceModal organizationId={organizationId} locales={locales} />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
