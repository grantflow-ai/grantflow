import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LandingPageButton, type LandingPageButtonProps } from "./button";

export function LandingPageSubmitButton({
	children,
	className = "",
	isLoading,
	rightIcon,
	...props
}: { canBeDisabled?: boolean; isLoading?: boolean; rightIcon?: React.ReactNode } & LandingPageButtonProps) {
	return (
		<LandingPageButton
			aria-busy={isLoading}
			className={cn("invalid:text-destructive-400 invalid:cursor-not-allowed", className)}
			data-testid="form-button"
			rightIcon={isLoading ? <Loader2 className="size-4 animate-spin" /> : rightIcon}
			type="submit"
			{...props}
		>
			{children}
		</LandingPageButton>
	);
}
