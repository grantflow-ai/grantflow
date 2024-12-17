"use server";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { getWorkspaces } from "@/actions/api";

export default async function WorkspacesListPage() {
	const workspaces = await getWorkspaces();

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
