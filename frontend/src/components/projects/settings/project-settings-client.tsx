"use client";

import { BellIcon, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
	ProjectSettingsAccount,
	ProjectSettingsLayout,
	ProjectSettingsMembers,
	ProjectSidebar,
} from "@/components/projects";
import { useUserStore } from "@/stores/user-store";
import type { API } from "@/types/api-types";
import type { UserRole } from "@/types/user";
import { ProjectSettingsNotifications } from "./project-settings-notifications";

interface ProjectSettingsClientProps {
	activeTab: "account" | "billing" | "members" | "notifications";
	initialProject: API.GetProject.Http200.ResponseBody;
}

const mockApplications = [
	{
		id: "1",
		name: "Application Name",
		status: "COMPLETED" as const,
	},
	{
		id: "2",
		name: "Application Name",
		status: "IN_PROGRESS" as const,
	},
	{
		id: "3",
		name: "Application Name",
		status: "DRAFT" as const,
	},
];

export function ProjectSettingsClient({ activeTab, initialProject }: ProjectSettingsClientProps) {
	const { user } = useUserStore();
	const [project] = useState(initialProject);

	const getInitials = () => {
		if (user?.displayName) {
			return user.displayName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		if (user?.email) {
			return user.email.slice(0, 2).toUpperCase();
		}
		return "U";
	};

	const renderContent = () => {
		switch (activeTab) {
			case "account": {
				return <ProjectSettingsAccount projectId={project.id} userRole={project.role as UserRole} />;
			}
			case "billing": {
				return <div>Billing & Payments content coming soon...</div>;
			}
			case "members": {
				return (
					<ProjectSettingsMembers
						currentUserRole={project.role as UserRole}
						projectId={project.id}
						projectName={project.name}
					/>
				);
			}
			case "notifications": {
				return <ProjectSettingsNotifications projectId={project.id} />;
			}
			default: {
				return null;
			}
		}
	};

	return (
		<div className="flex h-screen bg-white">
			<ProjectSidebar
				applications={mockApplications}
				projectId={project.id}
				userRole={project.role as UserRole}
			/>

			<div className="flex-1 bg-[#faf9fb]">
				<div className="flex flex-col h-full">
					{}
					<div className="h-[73px] flex items-center justify-end px-6 bg-[#faf9fb]">
						<div className="flex items-center gap-1">
							<button className="p-1 rounded-sm hover:bg-[#e1dfeb] transition-colors" type="button">
								<Plus className="size-4 text-[#636170]" />
							</button>
							<button className="p-1 rounded-sm hover:bg-[#e1dfeb] transition-colors" type="button">
								<BellIcon className="size-4 text-[#636170]" />
							</button>
							<div className="size-8 rounded bg-[#369e94] flex items-center justify-center ml-2 relative overflow-hidden">
								{user?.photoURL ? (
									<Image alt="Profile" className="rounded object-cover" fill src={user.photoURL} />
								) : (
									<span className="font-['Source_Sans_Pro'] font-semibold text-[16px] text-white">
										{getInitials()}
									</span>
								)}
							</div>
						</div>
					</div>

					{}
					<div className="flex-1 bg-white rounded-lg mx-6 mb-6 border border-[#e1dfeb] overflow-hidden">
						<ProjectSettingsLayout projectId={project.id} userRole={project.role as UserRole}>
							{renderContent()}
						</ProjectSettingsLayout>
					</div>
				</div>
			</div>
		</div>
	);
}
