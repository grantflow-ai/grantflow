import { Loader2 } from "lucide-react";

import { AppButton, type AppButtonProps } from "@/components/app/buttons/app-button";
import { cn } from "@/lib/utils";

export function SubmitButton({
	children,
	className = "",
	isLoading,
	rightIcon,
	...props
}: { canBeDisabled?: boolean; isLoading?: boolean; rightIcon?: React.ReactNode } & AppButtonProps) {
	return (
		<AppButton
			aria-busy={isLoading}
			className={cn("invalid:text-destructive-400 invalid:cursor-not-allowed", className)}
			data-testid="form-button"
			rightIcon={isLoading ? <Loader2 className="size-4 animate-spin" /> : rightIcon}
			type="submit"
			{...props}
		>
			{children}
		</AppButton>
	);
}