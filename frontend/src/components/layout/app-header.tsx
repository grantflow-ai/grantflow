"use client";

import { AvatarGroup } from "@/components/app";

import { Notification } from "@/components/projects/dashboard/notification";

interface AppHeaderProps {
	projectTeamMembers: {
		backgroundColor: string;
		imageUrl?: string;
		initials: string;
	}[];
}

export function AppHeader({ projectTeamMembers }: AppHeaderProps) {
	return (
		<header className="h-[73px] w-full flex justify-end items-center gap-1 px-6" data-testid="dashboard-header">
			<div
				className="size-8 flex items-center justify-center rounded-sm hover:bg-app-gray-100/50 p-2"
				data-testid="dashboard-notification"
			>
				<Notification />
			</div>
			<div className="flex items-center" data-testid="dashboard-avatar-group">
				<AvatarGroup className="border-0 rounded-none" size="md" users={projectTeamMembers} />
			</div>
		</header>
	);
}
