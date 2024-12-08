import { Button } from "gen/ui/button";
import { GrantApplicationCard } from "@/components/workspaces/detail/grant-application-card";
import { PagePath } from "@/enums";
import Link from "next/link";

import { Navbar } from "@/components/navbar";

import { useApiClient } from "@/utils/hooks";

export default async function WorkspaceDetailPage(props: {
	params: Promise<{
		workspaceId: string;
	}>;
}) {
	const apiClient = useApiClient();

	const { workspaceId } = await props.params;
	const workspace = await apiClient.getWorkspace(workspaceId);
	const applications = await apiClient.getApplications(workspace.id);

	const createApplicationUrl = PagePath.APPLICATIONS.toString().replace(":workspaceId", workspace.id);

	return (
		<div className="flex flex-col flex-1 ml-14">
			<Navbar>
				<span className="px-2 text-sm">{`${workspace.name} workspace`}</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="w-full h-full">
					<div className="py-4">
						<Button size="sm">
							<Link href={createApplicationUrl}>New Application</Link>
						</Button>
					</div>
					<div className="my-6 space-y-8">
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
