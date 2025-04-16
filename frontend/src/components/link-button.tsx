import { ReactNode } from "react";
import { Button, ButtonProps } from "@/components/ui/button";

export function IconLink({
	className,
	href,
	icon,
	label = "Visit the link",
	...buttonProps
}: {
	href: string;
	icon: ReactNode;
	label?: string;
} & ButtonProps) {
	return (
		<Button aria-label={label} asChild className={className} size="icon" variant="ghost" {...buttonProps}>
			<a href={href} rel="noopener noreferrer" target="_blank">
				{icon}
			</a>
		</Button>
	);
}
