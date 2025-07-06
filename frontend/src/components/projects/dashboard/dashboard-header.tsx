"use client";

import { AvatarGroup } from "@/components/app";

import { Notification } from "./notification";

interface DashboardHeaderProps {
	projectTeamMembers: {
		backgroundColor: string;
		initials: string;
	}[];
}

export function DashboardHeader({ projectTeamMembers }: DashboardHeaderProps) {
	return (
		<header className=" h-[73px] w-full flex justify-end items-center gap-2" data-testid="dashboard-header">
			<div className="size-8 flex items-center justify-center" data-testid="dashboard-notification">
				<Notification />
			</div>
			<div className="flex items-center   " data-testid="dashboard-avatar-group">
				<AvatarGroup className="border-0 rounded-none" size="md" users={projectTeamMembers} />
			</div>
		</header>
	);
}
