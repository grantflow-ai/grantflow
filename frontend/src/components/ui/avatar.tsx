"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
	backgroundColor?: string;
	className?: string;
	initials: string;
	size?: "lg" | "md" | "sm";
}

const sizeClasses = {
	lg: "h-12 w-12 text-base",
	md: "h-8 w-8 text-sm",
	sm: "h-6 w-6 text-xs",
};

const defaultColors = [
	"#369e94", // Teal
	"#9e366f", // Pink
	"#9747ff", // Purple
	"#5179fc", // Blue
];

interface AvatarGroupProps {
	className?: string;
	maxVisible?: number;
	size?: "lg" | "md" | "sm";
	users: AvatarUser[];
}

interface AvatarUser {
	backgroundColor?: string;
	initials: string;
}

export function Avatar({ backgroundColor, className, initials, size = "md" }: AvatarProps) {
	return (
		<div
			className={cn(
				"relative flex shrink-0 flex-row items-center justify-center gap-2.5 rounded p-0",
				sizeClasses[size],
				className,
			)}
			style={{ backgroundColor: backgroundColor ?? "#369e94" }}
		>
			<div className="flex size-full flex-col justify-center font-semibold not-italic leading-[0] text-center text-white font-['Source_Sans_Pro']">
				<p className="block leading-[20px]">{initials}</p>
			</div>
		</div>
	);
}

export function AvatarGroup({ className, maxVisible = 4, size = "md", users }: AvatarGroupProps) {
	const visibleUsers = users.slice(0, maxVisible);
	const remainingCount = users.length - maxVisible;

	return (
		<div className={cn("flex flex-row items-center gap-1", className)}>
			{visibleUsers.map((user, index) => (
				<Avatar
					backgroundColor={user.backgroundColor ?? defaultColors[index % defaultColors.length]}
					initials={user.initials}
					key={`${user.initials}-${index}`}
					size={size}
				/>
			))}
			{remainingCount > 0 && <Avatar backgroundColor="#636170" initials={`+${remainingCount}`} size={size} />}
		</div>
	);
}
