import { getLocale, type SupportedLocale } from "@/i18n";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Button } from "gen/ui/button";
import { SeparatorWithText } from "@/components/separator-with-text";
import { GrantApplicationCard } from "@/components/workspaces/detail/grantApplicationCard";
import { PagePath } from "@/enums";
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
		<div className="p-5">
			<div className="py-4">
				<h1 className="text-4xl font-bold">{workspace.name}</h1>
				<h3 className="text-lg font-bold py-2">{workspace.description}</h3>
			</div>
			<div className="py-24 flex flex-col gap-2">
				<div>
					<SeparatorWithText text={locales.workspaceDetailView.grantApplications.title} />
					<Button size="sm">
						<Link href={`${PagePath.APPLICATIONS}?workspaceId=${workspace.id}`}>
							{locales.workspaceDetailView.grantApplications.newApplication}
						</Link>
					</Button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{workspace.grantApplications.map(({ id, title }) => (
						<GrantApplicationCard key={id} id={id} title={title} />
					))}
				</div>
			</div>
		</div>
	);
}
