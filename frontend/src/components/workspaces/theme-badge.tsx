import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const themeBadgeVariants = cva("px-2 py-0.5 text-xs font-normal leading-none", {
	defaultVariants: {
		color: "primary",
		size: "default",
	},
	variants: {
		color: {
			light: "bg-badge text-badge-foreground",
			primary: "bg-primary text-primary-foreground",
			secondary: "bg-secondary text-secondary-foreground",
		},
		size: {
			default: "",
			sm: "px-1 text-[6.59px] leading-[9.88px]",
		},
	},
});

export interface ThemeBadgeProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
		VariantProps<typeof themeBadgeVariants> {
	leftIcon?: React.ReactElement<React.SVGProps<SVGSVGElement>>;
}

function ThemeBadge({ children, className, color, leftIcon, size, ...props }: ThemeBadgeProps) {
	return (
		<Badge
			className={cn(themeBadgeVariants({ color, size }), "hover:bg-inherit hover:text-inherit", className)}
			{...props}
		>
			{leftIcon && (
				<span className={size === "sm" ? "mr-0.5" : "mr-1"}>
					{React.isValidElement(leftIcon)
						? React.cloneElement(leftIcon, {
								height: size === "sm" ? 6 : undefined,
								width: size === "sm" ? 6 : undefined,
							})
						: leftIcon}
				</span>
			)}
			{children}
		</Badge>
	);
}

export { ThemeBadge, themeBadgeVariants };
