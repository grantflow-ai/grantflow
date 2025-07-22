import type { ReactNode } from "react";

export function WizardLeftPane({
	children,
	className = "",
	contentSpacing = "space-y-6",
	testId,
}: {
	children: ReactNode;
	className?: string;
	contentSpacing?: "space-y-2" | "space-y-6";
	testId?: string;
}) {
	return (
		<div className={`w-1/2 md:w-1/3 lg:w-1/4 min-w-1/4 h-full flex flex-col ${className}`} data-testid={testId}>
			<div className="flex-1 overflow-y-auto p-6">
				<div className={contentSpacing}>{children}</div>
			</div>
		</div>
	);
}
