import { Button, buttonVariants, type ButtonProps as ShadcnButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import React from "react";

const appButtonVariants = cva("size-auto font-button text-base rounded-sm font-light hover:bg-transparent", {
	compoundVariants: [
		{
			className: "border-white text-white before:border-white",
			theme: "light",
			variant: "secondary",
		},
		{
			className: "h-auto px-0 text-xl",
			size: "lg",
			variant: "link",
		},
	],
	defaultVariants: {
		size: "md",
		theme: "dark",
		variant: "primary",
	},
	variants: {
		size: {
			lg: "px-4 py-2",
			md: "px-3 py-1 text-sm",
			sm: "px-1 py-0.5 text-sm",
		},
		theme: {
			dark: "",
			light: "text-white",
		},
		variant: {
			link: "rounded-none bg-transparent font-normal hover:text-link-hover hover:no-underline",
			primary: "hover:bg-accent disabled:opacity-100 disabled:bg-muted",
			secondary:
				"text-primary border-primary border bg-transparent relative before:absolute before:-inset-px before:rounded-sm before:border-2 before:border-primary before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
		},
	},
});

export interface AppButtonProps
	extends Omit<ShadcnButtonProps, "size" | "variant">,
		VariantProps<typeof appButtonVariants> {
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	size?: "lg" | "md" | "sm";
	theme?: "dark" | "light";
	variant?: "link" | "primary" | "secondary";
}

export function AppButton({
	children,
	className,
	leftIcon,
	rightIcon,
	size,
	theme,
	variant,
	...props
}: AppButtonProps) {
	const combinedClassNames = cn(
		buttonVariants({
			size: size === "md" ? "default" : size,
			variant: variant === "primary" ? "default" : variant,
		}),
		appButtonVariants({ size, theme, variant }),
		className,
	);

	return (
		<Button className={combinedClassNames} {...props}>
			{leftIcon && <span className="mr-1 inline-flex items-center">{resizedIcon(leftIcon)} </span>}
			{children}
			{rightIcon && <span className="ml-1 inline-flex items-center">{resizedIcon(rightIcon)}</span>}
		</Button>
	);
}

function resizedIcon(icon: React.ReactNode, keepIconSize = false): React.ReactNode {
	if (!icon || keepIconSize) {
		return icon;
	}

	if (React.isValidElement(icon)) {
		return React.cloneElement(icon as React.ReactElement<React.HTMLProps<SVGSVGElement>>, {
			height: 16,
			width: 16,
		});
	}

	return icon;
}
