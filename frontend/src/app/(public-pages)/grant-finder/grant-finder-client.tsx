"use client";

import { GrantFinderHeader } from "@/components/grant-finder/grant-finder-header";
import { SearchWizard } from "@/components/grant-finder/search-wizard";

export function GrantFinderClient() {
	return (
		<div className="flex h-screen w-full flex-col bg-preview-bg" data-testid="grant-finder-client">
			<GrantFinderHeader />

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-testid="main-content">
					<div className="mb-8 text-center" data-testid="main-content-header">
						<h2
							className="font-heading text-3xl font-medium text-stone-900"
							data-testid="main-content-title"
						>
							Find Your Next Grant in Minutes
						</h2>
						<p
							className="mx-auto mt-4 max-w-3xl text-muted-foreground-dark text-sm leading-none"
							data-testid="main-content-subtitle"
						>
							Tell us about your research focus and we&apos;ll match you with relevant NIH funding
							opportunities.
						</p>
					</div>

					<SearchWizard />
				</div>
			</main>
		</div>
	);
}
