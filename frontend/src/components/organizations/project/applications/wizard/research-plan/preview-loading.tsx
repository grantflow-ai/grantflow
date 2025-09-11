"use client";

import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";

export function PreviewLoadingComponent() {
	return (
		<WizardRightPane padding="p-4 md:p-6">
			<div className="flex h-full flex-col items-center justify-center gap-4">
				<div className="relative">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
				</div>
				<p className="text-gray-600 font-medium">Generating content...</p>
			</div>
		</WizardRightPane>
	);
}
