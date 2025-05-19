import { Button, buttonVariants, type ButtonProps as ShadcnButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import React from "react";

const appButtonVariants = cva("font-button text-md rounded-sm font-light hover:bg-transparent", {
	compoundVariants: [
		{
			className: "border-white text-white before:border-white",
			theme: "light",
			variant: "secondary",
		},
		{
			className: "h-0 px-0 text-xl",
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
			lg: "h-9.5 px-4",
			md: "h-7.5 px-3",
			sm: "h-6 px-2 text-sm",
		},
		theme: {
			dark: "",
			light: "text-white",
		},
		variant: {
			link: "rounded-none bg-transparent font-normal hover:text-link-hover hover:no-underline",
			primary: "hover:bg-accent",
			secondary:
				"text-primary border-primary border bg-transparent relative before:absolute before:-inset-px before:rounded-sm before:border-2 before:border-primary before:opacity-0 hover:before:opacity-100 before:transition-opacity",
		},
	},
});

const ICON_DIMENSIONS_MAP = {
	lg: { height: 19, width: 19 },
	md: { height: 15, width: 15 },
	sm: { height: 13, width: 13 },
};

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
	const iconDimens = ICON_DIMENSIONS_MAP[size ?? "md"];

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
			{leftIcon && <span className="mr-1 inline-flex items-center">{resizedIcon(leftIcon, iconDimens)} </span>}
			{children}
			{rightIcon && <span className="ml-1 inline-flex items-center">{resizedIcon(rightIcon, iconDimens)}</span>}
		</Button>
	);
}

function resizedIcon(
	icon: React.ReactNode,
	dimens: { height: number; width: number },
	keepIconSize = false,
): React.ReactNode {
	if (!icon || keepIconSize) {
		return icon;
	}

	if (React.isValidElement(icon)) {
		return React.cloneElement(icon as React.ReactElement<React.HTMLProps<SVGSVGElement>>, {
			height: dimens.height,
			width: dimens.width,
		});
	}

	return icon;
}
