import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { Button, buttonVariants, type ButtonProps as ShadcnButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const landingPageButtonVariants = cva(
	"font-button size-auto cursor-pointer rounded-sm text-base font-light hover:bg-transparent",
	{
		compoundVariants: [
			{
				className: "border-white text-white before:border-white",
				theme: "light",
				variant: "secondary",
			},
			{
				className: "hover:text-link-hover-light",
				theme: "light",
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
				ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
				link: "hover:text-link-hover-dark rounded-none bg-transparent font-normal hover:no-underline",
				primary: "hover:bg-accent disabled:bg-muted disabled:opacity-100",
				secondary:
					"text-primary border-primary before:border-primary relative border bg-transparent before:pointer-events-none before:absolute before:-inset-px before:rounded-sm before:border-2 before:opacity-0 before:transition-opacity hover:before:opacity-100",
			},
		},
	},
);

export interface LandingPageButtonProps
	extends Omit<ShadcnButtonProps, "size" | "variant">,
		VariantProps<typeof landingPageButtonVariants> {
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	size?: "lg" | "md" | "sm";
	theme?: "dark" | "light";
	variant?: "ghost" | "link" | "primary" | "secondary";
}

export function LandingPageButton({
	asChild,
	children,
	className,
	leftIcon,
	rightIcon,
	size,
	theme,
	variant,
	...props
}: LandingPageButtonProps) {
	const getButtonVariant = () => {
		if (variant === "primary") return "default";
		if (variant === "ghost") return "ghost";
		return variant;
	};

	const combinedClassNames = cn(
		buttonVariants({
			size: size === "md" ? "default" : size,
			variant: getButtonVariant(),
		}),
		landingPageButtonVariants({ size, theme, variant }),
		className,
	);

	return (
		<Button asChild={asChild} className={combinedClassNames} {...props}>
			{leftIcon && <span className="mr-1 inline-flex items-center">{resizedIcon(leftIcon)} </span>}
			{children}
			{rightIcon && <span className="ml-1 inline-flex items-center">{resizedIcon(rightIcon)}</span>}
		</Button>
	);
}

// eslint-disable-next-line sonarjs/function-return-type
function resizedIcon(icon: React.ReactNode, keepIconSize = false): React.ReactNode {
	if (!icon || keepIconSize) {
		return icon;
	}

	if (React.isValidElement(icon)) {
		return React.cloneElement(icon as React.ReactElement<React.HTMLProps<SVGSVGElement>>, {
			height: 16,
			width: 16,
		}) as React.ReactNode;
	}

	return icon;
}