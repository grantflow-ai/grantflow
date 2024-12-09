"use client";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { Navbar } from "@/components/navbar";
import { getApiClient } from "@/utils/api-client";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function WorkspacesListPage() {
	const { workspaces, setWorkspaces } = useStore();

	useEffect(() => {
		(async () => {
			const workspaces = await getApiClient().getWorkspaces();
			setWorkspaces(workspaces);
		})();
	}, []);

	return (
		<div className="flex flex-col flex-1">
			<Navbar>
				<span className="px-2 text-sm">Workspaces</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="w-full h-full">
					<div className="py-4">
						<CreateWorkspaceModal />
					</div>
					<div className="my-6 space-y-8">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
							{workspaces.map((workspace) => (
								<WorkspaceCard key={workspace.id} workspace={workspace} />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
