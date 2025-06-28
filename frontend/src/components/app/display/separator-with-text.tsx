import { cn } from "@/lib/utils";

export function SeparatorWithText({ className, text }: { className?: string; text: string }) {
	return (
		<div className={cn("relative", className)} data-testid="separator">
			<div className="relative flex items-center">
				<div className="border-app-gray-300 grow border-t" />
				<span className="text-app-gray-600 mx-3 shrink text-sm" data-testid="separator-text">
					{text}
				</span>
				<div className="border-app-gray-300 grow border-t" />
			</div>
		</div>
	);
}
