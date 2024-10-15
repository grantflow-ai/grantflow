import { Button } from "gen/ui/button";
import { SeparatorWithText } from "@/components/separator-with-text";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";
import { getDatabaseClient } from "db/connection";
import { grantApplications, workspaces } from "db/schema";
import { eq } from "drizzle-orm";

export default async function WorkspaceDetailPage({
	params: { workspaceId },
}: {
	params: {
		workspaceId: string;
	};
}) {
	const db = getDatabaseClient();
	const workspace = await db.query.workspaces.findFirst({
		where: eq(workspaces.id, workspaceId),
	});

	if (!workspace) {
		return null;
	}

	const applications = await db.query.grantApplications.findMany({
		where: eq(grantApplications.workspaceId, workspace.id),
	});

	return (
		<div className="p-5">
			<div className="py-4">
				<h1 className="text-4xl font-bold">{workspace.name}</h1>
				<h3 className="text-lg font-bold py-2">{workspace.description}</h3>
			</div>
			<div className="py-24 flex flex-col gap-2">
				<div>
					<SeparatorWithText text={"Grant Applications"} />
					<Button size="sm">
						<Link href={`${PagePath.APPLICATIONS}?workspaceId=${workspace.id}`}>New Application</Link>
					</Button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{applications.map(({ id, title }) => (
						<GrantApplicationCard key={id} id={id} title={title} />
					))}
				</div>
			</div>
		</div>
	);
}
