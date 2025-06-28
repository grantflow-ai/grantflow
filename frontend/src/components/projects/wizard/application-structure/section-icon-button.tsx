import type React from "react";
import { AppButton } from "@/components/app";

export function SectionIconButton({
	children,
	className = "",
	"data-testid": dataTestId,
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	"data-testid"?: string;
	onClick?: () => void;
}) {
	return (
		<AppButton
			className={`size-6 cursor-pointer rounded-none hover:bg-gray-50 ${className}`}
			data-testid={dataTestId}
			onClick={onClick}
			size="sm"
			type="button"
			variant="ghost"
		>
			{children}
		</AppButton>
	);
}
