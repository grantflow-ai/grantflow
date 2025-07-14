"use client";

import { WizardRightPane } from "./wizard-right-pane";

export function PreviewLoadingComponent() {
	return (
		<WizardRightPane padding="p-4 md:p-6">
			<div className="flex h-full flex-col items-center justify-center gap-6">
				<div className="relative">
					<div className="flex size-96 items-center justify-center">
						<div className="relative">
							<div className="bg-gray-100 animate-pulse flex size-24 items-center justify-center rounded-full">
								<div className="bg-gray-200 size-12 rounded-full" />
							</div>

							<div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
								<div className="bg-blue-100 absolute -top-4 left-1/2 size-8 -translate-x-1/2 rounded-full" />
							</div>
							<div
								className="absolute inset-0 animate-spin"
								style={{ animationDirection: "reverse", animationDuration: "4s" }}
							>
								<div className="bg-purple-100 absolute -bottom-4 left-1/2 size-6 -translate-x-1/2 rounded-full" />
							</div>
							<div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s" }}>
								<div className="bg-green-100 absolute -left-4 top-1/2 size-4 -translate-y-1/2 rounded-full" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</WizardRightPane>
	);
}
