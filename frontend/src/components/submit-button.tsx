import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { AppButton, AppButtonProps } from "@/components/app-button";

export function SubmitButton({
	canBeDisabled = true,
	children,
	className = "",
	isLoading,
	rightIcon,
	...props
}: { canBeDisabled?: boolean; isLoading?: boolean; rightIcon?: React.ReactNode } & AppButtonProps) {
	const variantClasses = canBeDisabled
		? "disabled:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed"
		: "";

	return (
		<AppButton
			aria-busy={isLoading}
			className={cn("invalid:text-destructive-400 invalid:cursor-not-allowed", variantClasses, className)}
			data-testid="form-button"
			rightIcon={isLoading ? <Loader2 className="size-4 animate-spin" /> : rightIcon}
			type="submit"
			{...props}
		>
			{children}
		</AppButton>
	);
}
