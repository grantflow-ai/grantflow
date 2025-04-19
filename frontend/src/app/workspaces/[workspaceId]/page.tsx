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
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{workspace.name}</h1>
				<Button asChild size="sm">
					<Link href={createApplicationUrl}>New Application</Link>
				</Button>
			</div>
			<div className="bg-card rounded-lg border p-6">
				{workspace.grant_applications.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{workspace.grant_applications.map((application) => (
							<GrantApplicationCard
								application={application}
								key={application.id}
								workspaceId={workspaceId}
							/>
						))}
					</div>
				) : (
					<div className="py-12 text-center">
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
