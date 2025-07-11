import type React from "react";
import { AppCard } from "@/components/app";
import { cn } from "@/lib/utils";

interface PreviewCardProps extends React.ComponentProps<typeof AppCard> {
	children: React.ReactNode;
	className?: string;
}

export function PreviewCard({ children, className, ...props }: PreviewCardProps) {
	return (
		<AppCard className={cn("border-app-gray-100 border p-5 shadow-none gap-8 rounded-sm", className)} {...props}>
			{children}
		</AppCard>
	);
}
