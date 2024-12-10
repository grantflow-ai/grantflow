"use client";
import { Button } from "gen/ui/button";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";

import { Navbar } from "@/components/navbar";
import { getApiClient } from "@/utils/api-client";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function WorkspaceDetailPage() {
	const router = useRouter();
	const { workspaceId } = useParams<{
		workspaceId: string;
	}>();
	const { workspaces, applications, setApplications } = useStore();

	const workspace = workspaces.find((workspace) => workspace.id === workspaceId);

	if (!workspace) {
		router.replace(PagePath.WORKSPACES);
		return null;
	}

	useEffect(() => {
		(async () => {
			const applications = await getApiClient().getApplications(workspaceId);
			setApplications(applications);
		})();
	}, [workspaceId]);

	const createApplicationUrl = PagePath.APPLICATIONS.toString().replace(":workspaceId", workspaceId);

	return (
		<div className="flex flex-col flex-1">
			<Navbar>
				<span className="px-2 text-sm">{`${workspace.name} workspace`}</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="w-full h-full container">
					<Button size="sm">
						<Link href={createApplicationUrl}>New Application</Link>
					</Button>
					<div className="pace-y-8">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
							{applications.map((application) => (
								<GrantApplicationCard
									key={application.id}
									application={application}
									workspaceId={workspaceId}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
