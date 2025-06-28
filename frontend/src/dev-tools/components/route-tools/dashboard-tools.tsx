"use client";

import { ProjectListItemFactory } from "::testing/factories";
import { FileText, Plus, TrendingUp } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";

export function DashboardTools() {
	const addMockProjects = () => {
		const mockProjects = ProjectListItemFactory.batch(5);
		// Mock updating the projects state directly (dev-only)
		useProjectStore.setState({ projects: mockProjects });
		console.log("[Dev Tools] Added 5 mock projects");
	};

	const simulateEmptyState = () => {
		// Mock clearing projects state directly (dev-only)
		useProjectStore.setState({ projects: [] });
		console.log("[Dev Tools] Cleared all projects");
	};

	const simulateLoadingState = () => {
		// Mock loading state directly (dev-only)
		useProjectStore.setState({ areOperationsInProgress: true });
		setTimeout(() => {
			useProjectStore.setState({ areOperationsInProgress: false });
		}, 3000);
		console.log("[Dev Tools] Simulating loading state for 3 seconds");
	};

	const setUserRole = (role: "ADMIN" | "MEMBER" | "OWNER") => {
		const currentUser = useUserStore.getState().user;
		if (currentUser) {
			// Mock updating user role directly (dev-only) - note: user doesn't have role field in real store
			useUserStore.setState({ user: { ...currentUser, role } as { role: string } & typeof currentUser });
			console.log(`[Dev Tools] Updated user role to: ${role}`);
		}
	};

	return (
		<div className="space-y-4">
			<h4 className="font-medium">Dashboard Tools</h4>

			<div className="grid gap-3 md:grid-cols-2">
				<button
					className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700"
					onClick={addMockProjects}
					type="button"
				>
					<Plus className="h-4 w-4" />
					Add 5 Mock Projects
				</button>

				<button
					className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700"
					onClick={simulateEmptyState}
					type="button"
				>
					<FileText className="h-4 w-4" />
					Simulate Empty State
				</button>

				<button
					className="flex items-center gap-2 rounded bg-yellow-600 px-4 py-2 text-sm hover:bg-yellow-700"
					onClick={simulateLoadingState}
					type="button"
				>
					<TrendingUp className="h-4 w-4" />
					Simulate Loading
				</button>

				<button
					className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
					onClick={() => {
						const projects = ProjectListItemFactory.batch(3, {
							applications_count: 0,
						});
						// Mock setting projects directly (dev-only)
						useProjectStore.setState({ projects });
					}}
					type="button"
				>
					<Plus className="h-4 w-4" />
					Add Empty Projects
				</button>
			</div>

			<div className="mt-4 space-y-2">
				<p className="text-sm font-medium">Set User Role:</p>
				<div className="flex gap-2">
					{(["OWNER", "ADMIN", "MEMBER"] as const).map((role) => (
						<button
							className="rounded bg-purple-600 px-3 py-1 text-xs hover:bg-purple-700"
							key={role}
							onClick={() => {
								setUserRole(role);
							}}
							type="button"
						>
							{role}
						</button>
					))}
				</div>
			</div>

			<div className="mt-4 rounded bg-gray-700 p-3">
				<p className="text-xs text-gray-400">
					💡 Tip: Use the Scenarios tab to load pre-configured data sets for different testing scenarios.
				</p>
			</div>
		</div>
	);
}
