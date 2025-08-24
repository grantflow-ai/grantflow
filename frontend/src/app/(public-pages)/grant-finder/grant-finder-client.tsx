"use client";

import { useState } from "react";
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
		<div
			className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
			data-testid="grant-finder-client"
		>
			{/* Hero Background */}
			<div
				className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"
				data-testid="hero-background"
			/>

			{/* Hero Section */}
			<section className="relative z-10 pb-20 pt-32" data-testid="grant-finder-hero">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8" data-testid="hero-content">
					<div className="mx-auto max-w-5xl text-center">
						<div className="mb-6">
							<span
								className="inline-flex items-center rounded-full bg-white/20 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm"
								data-testid="hero-badge"
							>
								GrantFlow AI
							</span>
						</div>
						<h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">Find Grants</h1>
						<p className="mx-auto mb-8 max-w-2xl text-xl text-blue-100">
							Discover personalized NIH funding opportunities instantly
						</p>
					</div>
				</div>
			</section>

			{/* Main Content */}
			<section className="relative z-10 min-h-screen bg-gray-50 py-16" data-testid="grant-finder-main">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8" data-testid="main-content">
					<div className="mx-auto max-w-5xl">
						{/* Title Badge */}
						<div className="mb-8 text-center" data-testid="main-content-header">
							<h2 className="mt-4 text-3xl font-bold text-gray-900" data-testid="main-content-title">
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

						{/* Search Wizard or Results */}
						{showResults ? (
							<>
								<div className="mb-6 flex justify-between" data-testid="search-results-header">
									<h3
										className="text-2xl font-semibold text-gray-900"
										data-testid="search-results-title"
									>
										Search Results
									</h3>
									<button
										className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
										data-testid="new-search-button"
										onClick={handleNewSearch}
										type="button"
									>
										New Search
									</button>
								</div>
								<SearchResults searchParams={searchParams!} />
								<div className="mt-12" data-testid="subscription-section">
									<SubscriptionForm searchParams={searchParams!} />
								</div>
							</>
						) : (
							<SearchWizard onSubmit={handleSearch} />
						)}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			{!showResults && (
				<section className="relative z-10 border-t bg-white py-16" data-testid="grant-finder-cta">
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mx-auto max-w-4xl text-center">
							<h3 className="mb-4 text-2xl font-bold text-gray-900">
								Need priority access to new grants?
							</h3>
							<p className="mb-8 text-lg text-gray-600">
								Join leading research teams who are saving time, improving collaboration, and securing
								more funding with GrantFlow
							</p>
							<a
								className="inline-flex items-center rounded-md border border-blue-600 px-6 py-3 text-base font-medium text-blue-600 transition-colors hover:bg-blue-50"
								data-testid="priority-access-link"
								href="mailto:hello@grantflow.ai?subject=Priority Grant Access Request"
								rel="noopener noreferrer"
								target="_blank"
							>
								Get priority access
								<svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 20 20">
									<path
										d="M6 12l8-8m0 0v6m0-6H8"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
									/>
								</svg>
							</a>
						</div>
					</div>
				</section>
			)}
		</div>
	);
}
