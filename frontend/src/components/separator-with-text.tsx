import { cn } from "@/lib/utils";

export function SeparatorWithText({ className, text }: { className?: string; text: string }) {
	return (
		<div className={cn("relative", className)} data-testid="separator">
			<div className="relative flex items-center">
				<div className="grow border-t border-app-gray-300" />
				<span className="mx-3 shrink text-sm text-app-gray-600" data-testid="separator-text">
					{text}
				</span>
				<div className="grow border-t border-app-gray-300" />
			</div>
		</div>
	);
}
