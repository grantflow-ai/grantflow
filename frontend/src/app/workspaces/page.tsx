"use server";
import { getWorkspaces } from "@/actions/api";
import { CreateWorkspaceModal } from "@/components/workspaces/create-workspace-modal";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";

export default async function WorkspacesListPage() {
	const workspaces = await getWorkspaces();

	return (
		<div className="mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Workspaces</h1>
				<CreateWorkspaceModal />
			</div>
			<div className="bg-card rounded-lg border p-6">
				{workspaces.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{workspaces.map((workspace) => (
							<WorkspaceCard key={workspace.id} workspace={workspace} />
						))}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">You don&#39;t have any workspaces yet.</p>
						<CreateWorkspaceModal />
					</div>
				)}
			</div>
		</div>
	);
}
