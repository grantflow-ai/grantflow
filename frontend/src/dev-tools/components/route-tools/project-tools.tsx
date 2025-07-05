"use client";

import { ApplicationListItemFactory } from "::testing/factories";
import { Mail, Plus, Settings } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";

export function ProjectTools() {
	const project = useProjectStore((state) => state.project);

	const addMockApplications = () => {
		if (!project) return;

		ApplicationListItemFactory.batch(3);
	};

	const simulateInvitations = () => {
		// ~keep Simulating invitation flow
	};

	const changeUserRole = (role: "ADMIN" | "MEMBER" | "OWNER") => {
		if (!project) return;

		useProjectStore.setState({
			project: { ...project, role } as { role: string } & typeof project,
		});
	};

	const toggleProjectSettings = () => {
		// ~keep Project settings toggled
	};

	return (
		<div className="space-y-4">
			<h4 className="font-medium">Project Tools</h4>

			{project && (
				<div className="rounded bg-gray-700 p-3">
					<p className="text-sm">
						Project: <span className="font-bold text-purple-400">{project.name}</span>
					</p>
					<p className="text-sm">
						Role: <span className="font-bold text-green-400">{project.role}</span>
					</p>
					<p className="text-sm">
						Applications: <span className="font-bold">{project.grant_applications?.length || 0}</span>
					</p>
				</div>
			)}

			<div className="grid gap-3 md:grid-cols-2">
				<button
					className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700"
					disabled={!project}
					onClick={addMockApplications}
					type="button"
				>
					<Plus className="h-4 w-4" />
					Add Mock Applications
				</button>

				<button
					className="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-sm hover:bg-purple-700"
					onClick={simulateInvitations}
					type="button"
				>
					<Mail className="h-4 w-4" />
					Simulate Invitations
				</button>

				<button
					className="flex items-center gap-2 rounded bg-gray-600 px-4 py-2 text-sm hover:bg-gray-700"
					onClick={toggleProjectSettings}
					type="button"
				>
					<Settings className="h-4 w-4" />
					Toggle Settings
				</button>
			</div>

			<div className="space-y-2">
				<p className="text-sm font-medium">Change Your Role:</p>
				<div className="flex gap-2">
					{(["OWNER", "ADMIN", "MEMBER"] as const).map((role) => (
						<button
							className={`rounded px-3 py-1 text-xs ${
								project?.role === role
									? "bg-purple-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
							disabled={!project}
							key={role}
							onClick={() => {
								changeUserRole(role);
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
					💡 Tip: Change your role to test different permission levels and UI states.
				</p>
			</div>
		</div>
	);
}
