import { getLocale, type SupportedLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText } from "lucide-react";
import { Progress } from "gen/ui/progress";
import { Button } from "gen/ui/button";
import { Badge } from "gen/ui/badge";
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
	drafts: application_drafts (
		*,
		application_drafts_completion (
			completion_percentage	
		)
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
				{workspace.drafts.map((draft) => (
					<ApplicationDraftCard
						key={draft.id}
						id={draft.id}
						title={draft.title}
						percentComplete={draft.application_drafts_completion[0]?.completion_percentage ?? 0}
					/>
				))}
			</div>
		</div>
	);
}

function ApplicationDraftCard({ id, percentComplete, title }: { id: string; title: string; percentComplete: number }) {
	return (
		<Card className="overflow-hidden">
			<Link href={`/drafts/${id}`} className="absolute inset-0 z-10" data-testid={`application-draft-link-${id}`}>
				<span className="sr-only">Navigate to the {title} application draft</span>
			</Link>
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-semibold flex items-center space-x-2">
					<FileText className="h-6 w-6 text-primary" />
					<span>{title}</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground font-medium">Progress</span>
						<span className="text-foreground font-semibold">{percentComplete}%</span>
					</div>
					<Progress value={percentComplete} className="w-full" />
					{percentComplete === 100 && (
						<div className="flex justify-between">
							<Button size="sm">Resubmit</Button>
							<Badge className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
								Complete
							</Badge>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
