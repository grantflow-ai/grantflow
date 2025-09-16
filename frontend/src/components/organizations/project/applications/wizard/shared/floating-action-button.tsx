"use client";

import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
	children: React.ReactNode;
	className?: string;
	testId?: string;
}

export function FloatingActionButton({
	children,
	className,
	testId = "floating-action-button",
}: FloatingActionButtonProps) {
	return (
		<div
			className={cn(
				"absolute bottom-0 inset-x-0",
				"bg-surface-primary/95 backdrop-blur-md",
				"p-4",
				"z-10",
				"flex",
				className,
			)}
			data-testid={testId}
		>
			{children}
		</div>
	);
}
