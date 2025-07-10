import type { ReactNode } from "react";

export function WizardRightPane({
	children,
	className = "",
	padding,
	testId,
}: {
	children: ReactNode;
	className?: string;
	padding?: string;
	testId?: string;
}) {
	return (
		<div
			className={`bg-preview-bg flex flex-col border-l border-app-gray-100 flex-1 size-full overflow-y-auto ${className}`}
			data-testid={testId}
		>
			<div className={`flex-1 ${padding ?? ""}`}>{children}</div>
		</div>
	);
}
