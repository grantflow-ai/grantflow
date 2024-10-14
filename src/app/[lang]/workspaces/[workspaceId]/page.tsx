import { getLocale, type SupportedLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardHeader, CardTitle } from "gen/ui/card";
import { FileText } from "lucide-react";
import { Button } from "gen/ui/button";
import Link from "next/link";

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
	const { data: workspace, error } = await client
		.select(
			`
			*,
			grant_applications (
				id,
				title			
			)
		`,
		)
		.eq("id", workspaceId)
		.single();

	if (error) {
		return handleServerError(error, { message: "Failed to fetch workspace" });
	}

	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto my-16 space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-4xl font-bold">{workspace.name}</h1>
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="sm">
						Security Issues
					</Button>
					<Button variant="outline" size="sm">
						Project Status
					</Button>
					<Button size="sm">Connect</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{workspace.grant_applications.map(({ id, title }) => (
					<ApplicationDraftCard key={id} id={id} title={title} />
				))}
			</div>
		</div>
	);
}

function ApplicationDraftCard({ id, title }: { id: string; title: string }) {
	return (
		<Card className="overflow-hidden">
			<Link href={`/drafts/${id}`} className="absolute inset-0 z-10" data-testid={`application-draft-link-${id}`}>
				<span className="sr-only">Navigate to the {title} grant application</span>
			</Link>
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-semibold flex items-center space-x-2">
					<FileText className="h-6 w-6 text-primary" />
					<span>{title}</span>
				</CardTitle>
			</CardHeader>
		</Card>
	);
}
