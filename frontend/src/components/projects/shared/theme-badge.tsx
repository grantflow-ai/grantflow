import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const themeBadgeVariants = cva("px-2 py-0.5 text-xs font-normal leading-none rounded-full", {
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

const colorClasses = {
	light: "hover:bg-badge hover:text-badge-foreground",
	primary: "hover:bg-primary hover:text-primary-foreground",
	secondary: "hover:bg-secondary hover:text-secondary-foreground",
};

export interface ThemeBadgeProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
		VariantProps<typeof themeBadgeVariants> {
	leftIcon?: React.ReactNode;
}

function ThemeBadge({ children, className, color, leftIcon, size, ...props }: ThemeBadgeProps) {
	return (
		<Badge
			className={cn(
				themeBadgeVariants({ color, size }),
				"pointer-events-none [&>*]:pointer-events-auto",
				color && colorClasses[color],
				className,
			)}
			{...props}
		>
			{leftIcon && (
				<span>
					{React.isValidElement(leftIcon)
						? React.cloneElement(leftIcon as React.ReactElement<React.SVGProps<SVGElement>>, {
								...(size === "sm" && { height: 6, width: 6 }),
							})
						: leftIcon}
				</span>
			)}
			{children}
		</Badge>
	);
}

export { ThemeBadge, themeBadgeVariants };