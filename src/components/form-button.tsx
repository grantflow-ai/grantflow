import { cn } from "gen/cn";
import { Button, type ButtonProps } from "gen/ui/button";
import { Loader2 } from "lucide-react";

export function FormButton({ children, isLoading, className = "", ...props }: ButtonProps & { isLoading?: boolean }) {
	return (
		<Button
			className={cn(
				className,
				"disabled:text-gray-400 disabled:cursor-not-allowed invalid:text-gray-400 invalid:cursor-not-allowed",
			)}
			type="submit"
			aria-busy={isLoading}
			data-testid="form-button"
			{...props}
		>
			{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
		</Button>
	);
}
