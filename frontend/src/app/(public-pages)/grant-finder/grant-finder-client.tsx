"use client";

import { useState } from "react";
import { GrantFinderHeader } from "@/components/grant-finder/grant-finder-header";
import { SearchResults } from "@/components/grant-finder/search-results";
import { SearchWizard } from "@/components/grant-finder/search-wizard";
import { SubscriptionForm } from "@/components/grant-finder/subscription-form";
import type { SearchParams } from "@/components/grant-finder/types";

export function GrantFinderClient() {
	const [searchParams, setSearchParams] = useState<null | SearchParams>(null);
	const [showResults, setShowResults] = useState(false);

	const handleSearch = (params: SearchParams) => {
		setSearchParams(params);
		setShowResults(true);
	};

	const handleNewSearch = () => {
		setSearchParams(null);
		setShowResults(false);
	};

	return (
		<div className="flex h-screen w-full flex-col bg-preview-bg" data-testid="grant-finder-client">
			<GrantFinderHeader />

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-testid="main-content">
					{!showResults && (
						<div className="mb-8 text-center" data-testid="main-content-header">
							<h2 className="text-3xl font-bold text-gray-900" data-testid="main-content-title">
								Find Your Next Grant in Minutes
							</h2>
							<p
								className="mx-auto mt-4 max-w-3xl text-lg text-gray-600"
								data-testid="main-content-subtitle"
							>
								Tell us about your research focus and we&apos;ll match you with relevant NIH funding
								opportunities.
							</p>
						</div>
					)}

					{showResults ? (
						<>
							<SearchResults onBack={handleNewSearch} searchParams={searchParams!} />
							<div className="mt-12" data-testid="subscription-section">
								<SubscriptionForm searchParams={searchParams!} />
							</div>
						</>
					) : (
						<SearchWizard onSubmit={handleSearch} />
					)}
				</div>
			</main>
		</div>
	);
}
