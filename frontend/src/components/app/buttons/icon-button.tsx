import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
	"inline-flex items-center justify-center rounded transition-all disabled:pointer-events-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
	{
		defaultVariants: {
			size: "md",
			variant: "solid",
		},
		variants: {
			size: {
				lg: "size-10 p-2",
				md: "size-8 p-2",
				sm: "size-6 p-1",
			},
			variant: {
				float: "bg-transparent text-primary hover:bg-gray-50 disabled:text-gray-100",
				solid: "bg-primary text-primary-foreground hover:bg-accent disabled:bg-gray-200 ",
			},
		},
	},
);

export interface IconButtonProps extends ComponentProps<"button">, VariantProps<typeof iconButtonVariants> {
	asChild?: boolean;
}

export function IconButton({ asChild = false, className, size, variant, ...props }: IconButtonProps) {
	const Comp = asChild ? Slot : "button";

	return <Comp className={cn(iconButtonVariants({ className, size, variant }))} {...props} />;
}
