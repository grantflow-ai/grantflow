import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { AppButton, AppButtonProps } from "@/components/app-button";

export function SubmitButton({
	canBeDisabled = true,
	children,
	className = "",
	isLoading,
	...props
}: { canBeDisabled?: boolean; isLoading?: boolean } & AppButtonProps) {
	const variantClasses = canBeDisabled
		? "disabled:text-muted-foreground disabled:bg-muted disabled:cursor-not-allowed"
		: "";

	return (
		<AppButton
			aria-busy={isLoading}
			className={cn("invalid:text-destructive-400 invalid:cursor-not-allowed", variantClasses, className)}
			data-testid="form-button"
			type="submit"
			{...props}
		>
			{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : children}
		</AppButton>
	);
}
