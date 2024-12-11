"use client";

import { Button } from "gen/ui/button";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";
import { getApiClient } from "@/utils/api-client";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useEffect, useMemo } from "react";

export default function WorkspaceDetailPage() {
	const router = useRouter();
	const { workspaceId } = useParams<{
		workspaceId: string;
	}>();
	const { workspaces, applications, setApplications } = useStore();

	const workspace = useMemo(
		() => workspaces.find((workspace) => workspace.id === workspaceId),
		[workspaces, workspaceId],
	);

	useEffect(() => {
		if (workspace) {
			(async () => {
				const applications = await getApiClient().getApplications(workspaceId);
				setApplications(applications);
			})();
		} else {
			router.replace(PagePath.WORKSPACES);
		}
	}, [workspaceId, workspace, router]);

	if (!workspace) {
		return null;
	}

	const createApplicationUrl = PagePath.APPLICATIONS.toString().replace(":workspaceId", workspaceId);

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
