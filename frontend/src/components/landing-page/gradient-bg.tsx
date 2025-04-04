import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function GradientBackground({ className }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"bg-[radial-gradient(ellipse_at_bottom_right,var(--primary)_0%,transparent_70%)] opacity-70",
				className,
			)}
		></div>
	);
}
