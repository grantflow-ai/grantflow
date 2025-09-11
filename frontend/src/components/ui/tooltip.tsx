"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return (
		<TooltipProvider>
			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
		</TooltipProvider>
	);
}

function TooltipContent({
	children,
	className,
	showArrow = true,
	side = "top",
	sideOffset = 4,
	...props
}: {
	showArrow?: boolean;
	side?: "bottom" | "left" | "right" | "top";
} & React.ComponentProps<typeof TooltipPrimitive.Content>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				className={cn(
					"bg-secondary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-[3px] px-3 py-1 text-sm text-balance",
					className,
				)}
				data-slot="tooltip-content"
				side={side}
				sideOffset={sideOffset}
				{...props}
			>
				{children}
				{showArrow && <TooltipPrimitive.Arrow className="fill-secondary" height={8} width={10} />}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
