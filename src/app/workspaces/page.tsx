"use client";

import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { getApiClient } from "@/utils/api-client";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function WorkspacesListPage() {
	const { workspaces, setWorkspaces, setGrantCfps } = useStore();

	useEffect(() => {
		(async () => {
			const workspaces = await getApiClient().getWorkspaces();
			setWorkspaces(workspaces);

			const cfps = await getApiClient().getCfps();
			setGrantCfps(cfps);
		})();
	}, []);

	return (
		<div className="mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Workspaces</h1>
				<CreateWorkspaceModal />
			</div>
			<div className="border rounded-lg p-6 bg-card">
				{workspaces.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{workspaces.map((workspace) => (
							<WorkspaceCard key={workspace.id} workspace={workspace} />
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">You don&#39;t have any workspaces yet.</p>
						<CreateWorkspaceModal />
					</div>
				)}
			</div>
		</div>
	);
}
