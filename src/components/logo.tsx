import { cn } from "gen/cn";
import type { HTMLProps } from "react";

export function Logo({ className, ...props }: HTMLProps<HTMLDivElement>) {
	return (
		<div className={cn("font-filicudi-solid pr-2", className)} {...props} data-testid="logo">
			GrantFlow.AI
		</div>
	);
}
