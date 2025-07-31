"use client";

import { AvatarGroup } from "@/components/app";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { Notification } from "@/components/organizations/dashboard/notification";
import { useRef, useState } from "react";

interface AppHeaderProps {
	projectTeamMembers: {
		backgroundColor: string;
		imageUrl?: string;
		initials: string;
	}[];
}

export function AppHeader({ projectTeamMembers }: AppHeaderProps) {
	const [isNotificationOpen, setNotificationOpen] = useState(false);
	const notificationRef = useRef<HTMLButtonElement>(null);
	useOnClickOutside(notificationRef, () => {
		setNotificationOpen(false);
	});
	return (
		<header className="h-[73px] w-full flex justify-end items-center gap-1 px-6" data-testid="dashboard-header">
			<button
				className="size-8 flex items-center justify-center rounded-sm hover:bg-app-gray-100/50 p-2"
				data-testid="dashboard-notification"
				onClick={() => {
					setNotificationOpen(!isNotificationOpen);
				}}
				ref={notificationRef}
				type="button"
			>
				<Notification isOpen={isNotificationOpen} />
			</button>
			<div className="flex items-center" data-testid="dashboard-avatar-group">
				<AvatarGroup className="border-0 rounded-none" size="md" users={projectTeamMembers} />
			</div>
		</header>
	);
}
