"use server";

import { getWorkspace } from "@/actions/api";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
	const { workspaceId } = await params;

	const workspace = await getWorkspace(workspaceId);

	const createApplicationUrl = PagePath.NEW_APPLICATION.toString().replace(":workspaceId", workspaceId);

	return (
		<div className="mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">{workspace.name}</h1>
				<Button asChild size="sm">
					<Link href={createApplicationUrl}>New Application</Link>
				</Button>
			</div>
			<div className="border rounded-lg p-6 bg-card">
				{workspace.grant_applications.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{workspace.grant_applications.map((application) => (
							<GrantApplicationCard
								application={application}
								key={application.id}
								workspaceId={workspaceId}
							/>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">This workspace doesn&#39;t have any applications yet.</p>
						<Button asChild className="mt-4" size="sm">
							<Link href={createApplicationUrl}>Create New Application</Link>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
