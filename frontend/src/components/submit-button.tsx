import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children, className = "", isLoading, ...props }: { isLoading?: boolean } & ButtonProps) {
	return (
		<Button
			aria-busy={isLoading}
			className={cn(
				className,
				"disabled:text-muted-foreground-400 disabled:cursor-not-allowed invalid:text-destructive-400 invalid:cursor-not-allowed",
			)}
			data-testid="form-button"
			type="submit"
			{...props}
		>
			{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : children}
		</Button>
	);
}
