"use client";

import type * as React from "react";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppDropdownMenuItemProps extends Omit<React.ComponentProps<typeof DropdownMenuItem>, "variant"> {
	inset?: boolean;
	variant?: "default" | "destructive";
}

export function AppDropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenu>) {
	return <DropdownMenu {...props} />;
}

export function AppDropdownMenuCheckboxItem({ ...props }: React.ComponentProps<typeof DropdownMenuCheckboxItem>) {
	return <DropdownMenuCheckboxItem {...props} />;
}

export function AppDropdownMenuContent({ ...props }: React.ComponentProps<typeof DropdownMenuContent>) {
	return <DropdownMenuContent {...props} />;
}

export function AppDropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuGroup>) {
	return <DropdownMenuGroup {...props} />;
}

export function AppDropdownMenuItem({ inset, variant = "default", ...props }: AppDropdownMenuItemProps) {
	return <DropdownMenuItem data-testid="app-dropdown-menu-item" inset={inset} variant={variant} {...props} />;
}

export function AppDropdownMenuLabel({ ...props }: React.ComponentProps<typeof DropdownMenuLabel>) {
	return <DropdownMenuLabel {...props} />;
}

export function AppDropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuRadioGroup>) {
	return <DropdownMenuRadioGroup {...props} />;
}

export function AppDropdownMenuRadioItem({ ...props }: React.ComponentProps<typeof DropdownMenuRadioItem>) {
	return <DropdownMenuRadioItem {...props} />;
}

export function AppDropdownMenuSeparator({ ...props }: React.ComponentProps<typeof DropdownMenuSeparator>) {
	return <DropdownMenuSeparator {...props} />;
}

export function AppDropdownMenuShortcut({ ...props }: React.ComponentProps<typeof DropdownMenuShortcut>) {
	return <DropdownMenuShortcut {...props} />;
}

export function AppDropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuSub>) {
	return <DropdownMenuSub {...props} />;
}

export function AppDropdownMenuSubContent({ ...props }: React.ComponentProps<typeof DropdownMenuSubContent>) {
	return <DropdownMenuSubContent {...props} />;
}

export function AppDropdownMenuSubTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuSubTrigger>) {
	return <DropdownMenuSubTrigger {...props} />;
}

export function AppDropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuTrigger>) {
	return <DropdownMenuTrigger {...props} />;
}



export function DangerMenuItem({ children, className, ...props }: Omit<AppDropdownMenuItemProps, "variant">) {
	return (
		<AppDropdownMenuItem
			className={cn("text-destructive", className)}
			data-testid="danger-menu-item"
			variant="destructive"
			{...props}
		>
			{children}
		</AppDropdownMenuItem>
	);
}
