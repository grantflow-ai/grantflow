import type React from "react";
import { Button } from "@/components/ui/button";

export function SectionIconButton({
	children,
	className = "",
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}) {
	return (
		<Button
			className={`size-6 cursor-pointer rounded-none hover:bg-gray-50 ${className}`}
			onClick={onClick}
			size="icon"
			type="button"
			variant="ghost"
		>
			{children}
		</Button>
	);
}
