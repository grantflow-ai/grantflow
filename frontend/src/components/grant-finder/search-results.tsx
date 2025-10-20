"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { searchGrants } from "@/actions/grants";
import { AppButton } from "@/components/app/buttons/app-button";
import type { API } from "@/types/api-types";
import { GrantCard } from "./grant-card";
import type { Grant, SearchParams } from "./types";

interface SearchResultsProps {
	onBack?: () => void;
	searchParams: SearchParams;
}

export function SearchResults({ onBack, searchParams }: SearchResultsProps) {
	const [grants, setGrants] = useState<Grant[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<null | string>(null);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const limit = 20;

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);

				const queryParams: API.GrantsHandleSearchGrants.QueryParameters = {
					limit,
					offset: 0,
					search_query: (searchParams.keywords ?? []).join(" "),
				};

				const response = await searchGrants(queryParams);
				const results: Grant[] = Array.isArray(response) ? (response as Grant[]) : [];
				setGrants(results);
				setOffset(limit);
				setHasMore(results.length === limit);
			} catch {
				setError("Failed to load grants. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, [searchParams]);

	const loadGrants = async (reset = false) => {
		try {
			setLoading(true);
			setError(null);

			const currentOffset = reset ? 0 : offset;
			const queryParams: API.GrantsHandleSearchGrants.QueryParameters = {
				limit,
				offset: currentOffset,
				search_query: (searchParams.keywords ?? []).join(" "),
			};

			const response = await searchGrants(queryParams);
			const results: Grant[] = Array.isArray(response) ? (response as Grant[]) : [];

			if (reset) {
				setGrants(results);
				setOffset(limit);
			} else {
				setGrants((prev) => [...prev, ...results]);
				setOffset((prev) => prev + limit);
			}

			setHasMore(results.length === limit);
		} catch {
			setError("Failed to load grants. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const loadMore = () => {
		if (!loading && hasMore) {
			void loadGrants(false);
		}
	};

	if (loading && grants.length === 0) {
		return (
			<div className="flex h-64 items-center justify-center" data-testid="search-results-loading">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" role="progressbar" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4" data-testid="search-results-error">
				<p className="text-red-800">{error}</p>
			</div>
		);
	}

	if (grants.length === 0) {
		return (
			<div
				className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
				data-testid="search-results-empty"
			>
				<p className="text-gray-600">
					No grants found matching your criteria. Try adjusting your search parameters.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6" data-testid="search-results-container">
			{onBack && (
				<div className="mb-6 flex items-center justify-between" data-testid="search-results-header">
					<AppButton
						data-testid="new-search-button"
						leftIcon={<ArrowLeft />}
						onClick={onBack}
						size="md"
						variant="secondary"
					>
						New Search
					</AppButton>
					<h3 className="font-heading text-2xl font-medium text-stone-900" data-testid="search-results-title">
						{grants.length} Grant{grants.length === 1 ? "" : "s"} Found
					</h3>
				</div>
			)}

			<div className="grid gap-4" data-testid="grants-grid">
				{grants.map((grant, index) => (
					<GrantCard grant={grant} key={`${grant.id || index}`} />
				))}
			</div>

			{hasMore && (
				<div className="flex justify-center" data-testid="load-more-section">
					<AppButton
						data-testid="load-more-button"
						disabled={loading}
						leftIcon={loading ? <Loader2 className="animate-spin" role="progressbar" /> : undefined}
						onClick={loadMore}
						size="lg"
						variant="primary"
					>
						{loading ? "Loading..." : "Load More"}
					</AppButton>
				</div>
			)}
		</div>
	);
}
