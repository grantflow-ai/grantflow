"use client";

import { AppButton } from "@/components/app-button";
import { IconPreviewLogo } from "@/components/projects/icons";

export function ResearchDeepDiveStep() {
	return (
		<div className="flex size-full" data-testid="research-deep-dive-step">
			<div className="w-1/3 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="research-deep-dive-header"
						>
							Research Deep Dive
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="research-deep-dive-description"
						>
							Conduct comprehensive research to strengthen your grant application with evidence-based
							insights.
						</p>
					</div>

					<div className="space-y-4">
						<AppButton className="w-full" variant="primary">
							Let the AI try
						</AppButton>
					</div>
				</div>
			</div>

			<ResearchDeepDivePreview />
		</div>
	);
}

function ResearchDeepDivePreview() {
	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			<div className="flex h-full flex-col items-center justify-center">
				<IconPreviewLogo height={180} width={180} />
				<p className="text-muted-foreground-dark mt-6 text-center text-sm">
					Start your research deep dive to see analysis and insights
				</p>
			</div>
		</div>
	);
}