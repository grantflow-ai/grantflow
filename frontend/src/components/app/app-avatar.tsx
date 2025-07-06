"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarProps {
	backgroundColor?: string;
	borderRadius?: string;
	className?: string;
	imageUrl?: string;
	initials: string;
	size?: "lg" | "md" | "sm";
}

const sizeClasses = {
	lg: "h-12 w-12 text-base",
	md: "h-8 w-8 text-sm",
	sm: "h-6 w-6 text-xs",
};

const defaultColors = ["#369e94", "#9e366f", "#9747ff", "#5179fc"];

interface AvatarGroupProps {
	className?: string;
	maxVisible?: number;
	size?: "lg" | "md" | "sm";
	users: AvatarUser[];
}

interface AvatarUser {
	backgroundColor?: string;
	imageUrl?: string;
	initials: string;
}

export function AppAvatar({ backgroundColor, borderRadius, className, imageUrl, initials, size = "md" }: AvatarProps) {
	return (
		<Avatar className={cn(sizeClasses[size], className)} data-testid="app-avatar" style={{ borderRadius }}>
			{imageUrl && <AvatarImage alt={initials} data-testid="app-avatar-image" src={imageUrl} />}
			<AvatarFallback
				className="font-semibold not-italic text-white"
				data-testid="app-avatar-fallback"
				style={{ backgroundColor: backgroundColor ?? "#369e94" }}
			>
				{initials}
			</AvatarFallback>
		</Avatar>
	);
}

export function AvatarGroup({ className, maxVisible = 4, size = "md", users }: AvatarGroupProps) {
	const visibleUsers = users.slice(0, maxVisible);
	const remainingCount = users.length - maxVisible;

	return (
		<div className={cn("flex flex-row items-center space-x-1", className)} data-testid="avatar-group">
			{visibleUsers.map((user, index) => (
				<AppAvatar
					backgroundColor={user.backgroundColor ?? defaultColors[index % defaultColors.length]}
					borderRadius="4px"
					className="rounded-sm"
					imageUrl={user.imageUrl}
					initials={user.initials}
					key={`${user.initials}-${index}`}
					size={size}
				/>
			))}
			{remainingCount > 0 && (
				<AppAvatar
					backgroundColor="#636170"
					borderRadius="4px"
					className="rounded-sm "
					initials={`+${remainingCount}`}
					size={size}
				/>
			)}
		</div>
	);
}
