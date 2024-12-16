"use server";

import { Button } from "gen/ui/button";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";
import { getApplications, getCfps, getWorkspace } from "@/app/actions/api";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
	const { workspaceId } = await params;
	const workspace = await getWorkspace(workspaceId);
	const applications = await getApplications(workspaceId);
	const grantCfps = await getCfps();

	const createApplicationUrl = PagePath.NEW_APPLICATION.toString().replace(":workspaceId", workspaceId);

	return (
		<div className="mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">{workspace.name}</h1>
				<Button size="sm" asChild>
					<Link href={createApplicationUrl}>New Application</Link>
				</Button>
			</div>
			<div className="border rounded-lg p-6 bg-card">
				{applications.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{applications.map((application) => (
							<GrantApplicationCard
								key={application.id}
								application={application}
								workspaceId={workspaceId}
								cfps={grantCfps}
							/>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">This workspace doesn&#39;t have any applications yet.</p>
						<Button size="sm" asChild className="mt-4">
							<Link href={createApplicationUrl}>Create New Application</Link>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
