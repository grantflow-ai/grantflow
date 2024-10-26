import { Button } from "gen/ui/button";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";
import { getDatabaseClient } from "db/connection";
import { grantApplications, workspaces } from "db/schema";
import { eq } from "drizzle-orm";

export default async function WorkspaceDetailPage(props: {
	params: Promise<{
		workspaceId: string;
	}>;
}) {
	const params = await props.params;

	const { workspaceId } = params;

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

	const createApplicationUrl = PagePath.APPLICATIONS.toString().replace(":workspaceId", workspaceId);

	return (
		<div className="p-5">
			<div className="py-4">
				<h1 className="text-4xl font-bold">{workspace.name}</h1>
				<h3 className="text-lg font-bold py-2">{workspace.description}</h3>
			</div>
			<div className="flex flex-col gap-2">
				<div className="py-2">
					<Button size="sm">
						<Link href={createApplicationUrl}>New Application</Link>
					</Button>
				</div>
				{applications.length ? (
					<div className="border-1 rounded grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{applications.map((application) => (
							<GrantApplicationCard key={application.id} {...application} />
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
