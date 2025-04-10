import { Button, buttonVariants, type ButtonProps as ShadcnButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import React, { cloneElement, HTMLProps, isValidElement, ReactNode } from "react";

const appButtonVariants = cva("font-button font-light text-md rounded-sm hover:bg-transparent", {
	compoundVariants: [
		{
			className: "border-white",
			theme: "light",
			variant: "secondary",
		},
		{
			className: "text-xl px-0 h-0",
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
			sm: "text-sm h-6 px-2",
		},
		theme: {
			dark: "",
			light: "text-white",
		},
		variant: {
			link: "font-normal bg-transparent rounded-none hover:text-slate-500 hover:no-underline",
			primary: "hover:bg-slate-500",
			secondary: "bg-transparent border text-primary border-primary hover:text-slate-500 hover:border-slate-500",
		},
	},
});

const ICON_DIMENSIONS_MAP = {
	lg: { height: 19, width: 19 },
	md: { height: 15, width: 15 },
	sm: { height: 13, width: 13 },
};

interface AppButtonProps extends Omit<ShadcnButtonProps, "size" | "variant">, VariantProps<typeof appButtonVariants> {
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
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

function resizedIcon(icon: ReactNode, dimens: { height: number; width: number }, keepIconSize = false): ReactNode {
	if (!icon || keepIconSize) {
		return icon;
	}

	if (isValidElement(icon)) {
		return cloneElement(icon as React.ReactElement<HTMLProps<SVGSVGElement>>, {
			height: dimens.height,
			width: dimens.width,
		});
	}

	return icon;
}
