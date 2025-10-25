import { GrantFactory, SearchParamsFactory } from "::testing/factories";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as grantsActions from "@/actions/grants";
import type { API } from "@/types/api-types";
import { SearchResults } from "./search-results";

vi.mock("@/actions/grants");

describe.sequential("SearchResults", () => {
	const mockSearchGrants = vi.mocked(grantsActions.searchGrants);
	const user = userEvent.setup();

	beforeEach(() => {
		mockSearchGrants.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	describe("Initial rendering", () => {
		it("renders search results container with testid", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["CRISPR"] });
			const mockGrants = GrantFactory.batch(3);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("search-results-container")).toBeInTheDocument();
			});
		});

		it("shows loading state initially", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["cancer"] });
			mockSearchGrants.mockImplementation(() => new Promise(() => {}));

			render(<SearchResults searchParams={searchParams} />);

			expect(screen.getByTestId("search-results-loading")).toBeInTheDocument();
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("calls searchGrants with correct parameters on mount", () => {
			const searchParams = SearchParamsFactory.build({
				keywords: ["CRISPR", "gene editing"],
			});
			const mockGrants = GrantFactory.batch(5);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			expect(mockSearchGrants).toHaveBeenCalledWith({
				limit: 20,
				offset: 0,
				search_query: "CRISPR gene editing",
			});
		});
	});

	describe("Grant display", () => {
		it("displays grants in grid layout", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["immunotherapy"] });
			const mockGrants = GrantFactory.batch(3);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("grants-grid")).toBeInTheDocument();
				expect(screen.getAllByTestId("grant-card")).toHaveLength(3);
			});
		});

		it("passes correct grant data to GrantCard components", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["oncology"] });
			const mockGrants = [
				GrantFactory.build({
					activity_code: "R01",
					id: "grant-1",
					title: "Cancer Research Grant",
				}),
				GrantFactory.build({
					activity_code: "R21",
					id: "grant-2",
					title: "Immunology Study",
				}),
			];
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByText("Cancer Research Grant")).toBeInTheDocument();
				expect(screen.getByText("Immunology Study")).toBeInTheDocument();
				expect(screen.getByText("R01")).toBeInTheDocument();
				expect(screen.getByText("R21")).toBeInTheDocument();
			});
		});

		it("uses grant id as key when available", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["research"] });
			const mockGrants = [
				GrantFactory.build({ id: "unique-grant-id" }),
				GrantFactory.build({ id: "another-grant-id" }),
			];
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				const grantCards = screen.getAllByTestId("grant-card");
				expect(grantCards).toHaveLength(2);
			});
		});

		it("falls back to index as key when grant has no id", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["medicine"] });
			const mockGrants = [
				{ ...GrantFactory.build(), id: "" },
				{ ...GrantFactory.build(), id: "" },
			];
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				const grantCards = screen.getAllByTestId("grant-card");
				expect(grantCards).toHaveLength(2);
			});
		});
	});

	describe("Empty states", () => {
		it("displays empty state when no grants are found", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["nonexistent"] });
			mockSearchGrants.mockResolvedValue([]);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("search-results-empty")).toBeInTheDocument();
				expect(
					screen.getByText("No grants found matching your criteria. Try adjusting your search parameters."),
				).toBeInTheDocument();
			});
		});

		it("does not show load more button when no grants found", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["nothing"] });
			mockSearchGrants.mockResolvedValue([]);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.queryByTestId("load-more-section")).not.toBeInTheDocument();
			});
		});
	});

	describe("Error handling", () => {
		it("displays error state when API call fails", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["test"] });
			mockSearchGrants.mockRejectedValue(new Error("API Error"));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("search-results-error")).toBeInTheDocument();
				expect(screen.getByText("Failed to load grants. Please try again.")).toBeInTheDocument();
			});
		});

		it("shows error styling for error state", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["error"] });
			mockSearchGrants.mockRejectedValue(new Error("Network error"));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				const errorContainer = screen.getByTestId("search-results-error");
				expect(errorContainer).toHaveClass("border-red-200", "bg-red-50");
				expect(errorContainer.querySelector("p")).toHaveClass("text-red-800");
			});
		});
	});

	describe("Load more functionality", () => {
		it("shows load more button when there are more results", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["popular"] });
			const mockGrants = GrantFactory.batch(20);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("load-more-section")).toBeInTheDocument();
				expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
				expect(screen.getByText("Load More")).toBeInTheDocument();
			});
		});

		it("hides load more button when no more results", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["limited"] });
			const mockGrants = GrantFactory.batch(10);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.queryByTestId("load-more-section")).not.toBeInTheDocument();
			});
		});

		it("loads more results when load more button is clicked", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["expandable"] });
			const initialGrants = GrantFactory.batch(20);
			const additionalGrants = GrantFactory.batch(15);

			mockSearchGrants.mockResolvedValueOnce(initialGrants).mockResolvedValueOnce(additionalGrants);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(20);
			});

			const loadMoreButton = screen.getByTestId("load-more-button");
			await user.click(loadMoreButton);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(35);
			});

			expect(mockSearchGrants).toHaveBeenNthCalledWith(2, {
				limit: 20,
				offset: 20,
				search_query: "expandable",
			});
		});

		it("shows loading state on load more button during additional request", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["loading"] });
			const initialGrants = GrantFactory.batch(20);

			mockSearchGrants.mockResolvedValueOnce(initialGrants).mockImplementation(() => new Promise(() => {}));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(20);
			});

			const loadMoreButton = screen.getByTestId("load-more-button");
			await user.click(loadMoreButton);

			expect(loadMoreButton).toBeDisabled();
			expect(screen.getByText("Loading...")).toBeInTheDocument();
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("handles error during load more gracefully", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["failing"] });
			const initialGrants = GrantFactory.batch(20);

			mockSearchGrants.mockResolvedValueOnce(initialGrants).mockRejectedValueOnce(new Error("Load more failed"));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(20);
			});

			const loadMoreButton = screen.getByTestId("load-more-button");
			await user.click(loadMoreButton);

			await waitFor(() => {
				expect(screen.getByTestId("search-results-error")).toBeInTheDocument();
				expect(screen.getByText("Failed to load grants. Please try again.")).toBeInTheDocument();
			});
		});

		it("hides load more button after loading final batch", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["final"] });
			const initialGrants = GrantFactory.batch(20);
			const finalGrants = GrantFactory.batch(5);

			mockSearchGrants.mockResolvedValueOnce(initialGrants).mockResolvedValueOnce(finalGrants);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
			});

			const loadMoreButton = screen.getByTestId("load-more-button");
			await user.click(loadMoreButton);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(25);
				expect(screen.queryByTestId("load-more-section")).not.toBeInTheDocument();
			});
		});
	});

	describe("Search parameter updates", () => {
		it("reloads data when search parameters change", async () => {
			const initialSearchParams = SearchParamsFactory.build({
				keywords: ["initial"],
			});
			const initialGrants = GrantFactory.batch(3);
			mockSearchGrants.mockResolvedValue(initialGrants);

			const { rerender } = render(<SearchResults searchParams={initialSearchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(3);
			});

			const newSearchParams = SearchParamsFactory.build({
				keywords: ["updated"],
			});
			const newGrants = GrantFactory.batch(5);
			mockSearchGrants.mockResolvedValue(newGrants);

			rerender(<SearchResults searchParams={newSearchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(5);
			});

			expect(mockSearchGrants).toHaveBeenCalledTimes(2);
			expect(mockSearchGrants).toHaveBeenLastCalledWith({
				limit: 20,
				offset: 0,
				search_query: "updated",
			});
		});

		it("resets pagination when search parameters change", async () => {
			const initialSearchParams = SearchParamsFactory.build({
				keywords: ["pagination"],
			});
			const initialGrants = GrantFactory.batch(20);
			const additionalGrants = GrantFactory.batch(10);

			mockSearchGrants.mockResolvedValueOnce(initialGrants).mockResolvedValueOnce(additionalGrants);

			const { rerender } = render(<SearchResults searchParams={initialSearchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
			});

			const loadMoreButton = screen.getByTestId("load-more-button");
			await user.click(loadMoreButton);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(30);
			});

			const newSearchParams = SearchParamsFactory.build({
				keywords: ["reset"],
			});
			const newGrants = GrantFactory.batch(15);
			mockSearchGrants.mockResolvedValue(newGrants);

			rerender(<SearchResults searchParams={newSearchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(15);
			});

			expect(mockSearchGrants).toHaveBeenLastCalledWith({
				limit: 20,
				offset: 0,
				search_query: "reset",
			});
		});
	});

	describe("API response handling", () => {
		it("correctly processes grants from API", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["typeguard"] });

			const grants = GrantFactory.batch(3);
			mockSearchGrants.mockResolvedValue(grants);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(3);
			});
		});

		it("handles empty array response", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["no-results"] });

			mockSearchGrants.mockResolvedValue([]);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("search-results-empty")).toBeInTheDocument();
			});
		});
	});

	describe("Performance", () => {
		it("does not make redundant API calls", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["performance"] });
			const mockGrants = GrantFactory.batch(5);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(5);
			});

			expect(mockSearchGrants).toHaveBeenCalledTimes(1);
		});

		it("prevents multiple load more requests", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["concurrent"] });
			const initialGrants = GrantFactory.batch(20);
			const additionalGrants = GrantFactory.batch(10);

			mockSearchGrants
				.mockResolvedValueOnce(initialGrants)
				.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(additionalGrants), 100)));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
			});

			const loadMoreButton = screen.getByTestId("load-more-button");

			await user.click(loadMoreButton);
			await user.click(loadMoreButton);
			await user.click(loadMoreButton);

			expect(loadMoreButton).toBeDisabled();

			await waitFor(() => {
				expect(screen.getAllByTestId("grant-card")).toHaveLength(30);
			});

			expect(mockSearchGrants).toHaveBeenCalledTimes(2);
		});
	});

	describe("Accessibility", () => {
		it("has proper loading state announcements", () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["accessibility"] });
			mockSearchGrants.mockImplementation(() => new Promise(() => {}));

			render(<SearchResults searchParams={searchParams} />);

			const loadingElement = screen.getByTestId("search-results-loading");
			expect(loadingElement.querySelector('[role="progressbar"]')).toBeInTheDocument();
		});

		it("has proper error state styling", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["error-a11y"] });
			mockSearchGrants.mockRejectedValue(new Error("Accessibility error"));

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				const errorElement = screen.getByTestId("search-results-error");
				expect(errorElement).toHaveClass("border-red-200", "bg-red-50");
			});
		});

		it("has proper button states", async () => {
			const searchParams = SearchParamsFactory.build({ keywords: ["button-states"] });
			const mockGrants = GrantFactory.batch(20);
			mockSearchGrants.mockResolvedValue(mockGrants as API.GrantsHandleSearchGrants.Http200.ResponseBody);

			render(<SearchResults searchParams={searchParams} />);

			await waitFor(() => {
				const loadMoreButton = screen.getByTestId("load-more-button");
				expect(loadMoreButton).not.toBeDisabled();
			});
		});
	});
});
