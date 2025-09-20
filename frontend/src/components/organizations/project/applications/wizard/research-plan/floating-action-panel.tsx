"use client";

import { cn } from "@/lib/utils";

interface FloatingActionPanelProps {
	children: React.ReactNode;
	className?: string;
	testId?: string;
}

export function FloatingActionPanel({
	children,
	className,
	testId = "floating-action-panel",
}: FloatingActionPanelProps) {
	return (
		<div
			className={cn(
				"absolute bottom-0 inset-x-0",
				"bg-surface-primary/95 backdrop-blur-md",
				"p-4",
				"z-10",
				"flex flex-col gap-4",
				className,
			)}
			data-testid={testId}
		>
			{children}
		</div>
	);
}
