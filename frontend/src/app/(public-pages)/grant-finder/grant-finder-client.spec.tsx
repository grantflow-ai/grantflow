import { GrantFactory } from "::testing/factories";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as grantsActions from "@/actions/grants";
import { GrantFinderClient } from "./grant-finder-client";

vi.mock("@/actions/grants");
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
	},
}));

describe.sequential("GrantFinderClient", () => {
	const mockSearchGrants = vi.mocked(grantsActions.searchGrants);
	const user = userEvent.setup();

	beforeEach(() => {
		mockSearchGrants.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders with correct testids and initial state", () => {
		render(<GrantFinderClient />);

		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();
		expect(screen.getByTestId("grant-finder-hero")).toBeInTheDocument();
		expect(screen.getByTestId("grant-finder-main")).toBeInTheDocument();
		expect(screen.getByTestId("grant-finder-cta")).toBeInTheDocument();
	});

	it("displays hero content correctly", () => {
		render(<GrantFinderClient />);

		expect(screen.getByTestId("hero-content")).toBeInTheDocument();
		expect(screen.getByText("GrantFlow AI")).toBeInTheDocument();
		expect(screen.getByText("Find Grants")).toBeInTheDocument();
		expect(screen.getByText("Discover personalized NIH funding opportunities instantly")).toBeInTheDocument();
	});

	it("displays main content header correctly", () => {
		render(<GrantFinderClient />);

		expect(screen.getByTestId("main-content-header")).toBeInTheDocument();
		expect(screen.getByTestId("main-content-title")).toHaveTextContent("Find Your Next Grant in Minutes");
		expect(screen.getByTestId("main-content-subtitle")).toHaveTextContent(
			"Tell us about your research focus and we'll match you with relevant NIH funding opportunities.",
		);
	});

	it("displays CTA section when not showing results", () => {
		render(<GrantFinderClient />);

		expect(screen.getByTestId("grant-finder-cta")).toBeInTheDocument();
		expect(screen.getByText("Need priority access to new grants?")).toBeInTheDocument();
		expect(screen.getByTestId("priority-access-link")).toBeInTheDocument();
	});

	it("shows search wizard initially", () => {
		render(<GrantFinderClient />);

		expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
		expect(screen.queryByTestId("search-results-container")).not.toBeInTheDocument();
	});

	it("shows search results after wizard submission", async () => {
		const mockGrants = GrantFactory.batch(5);
		mockSearchGrants.mockResolvedValue(mockGrants);

		render(<GrantFinderClient />);

		// Fill and submit the wizard
		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "CRISPR research");

		const nextButton = screen.getByTestId("wizard-next-button");
		await user.click(nextButton); // Activity codes
		await user.click(nextButton); // Institution location

		const institutionSelect = screen.getByTestId("institution-location-select");
		await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
		await user.click(nextButton); // Career stage

		const careerSelect = screen.getByTestId("career-stage-select");
		await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
		await user.click(nextButton); // Email alerts

		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "test@research.edu");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);

		const submitButton = screen.getByTestId("wizard-submit-button");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("search-results-container")).toBeInTheDocument();
			expect(screen.queryByTestId("search-wizard")).not.toBeInTheDocument();
		});
	});

	it("passes search parameters to results and subscription components", async () => {
		const mockGrants = GrantFactory.batch(3);
		mockSearchGrants.mockResolvedValue(mockGrants);

		render(<GrantFinderClient />);

		// Submit wizard with specific parameters
		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "machine learning, AI");

		const nextButton = screen.getByTestId("wizard-next-button");
		await user.click(nextButton);
		await user.click(nextButton);

		const institutionSelect = screen.getByTestId("institution-location-select");
		await user.selectOptions(institutionSelect, "Non-U.S. (foreign) institution");
		await user.click(nextButton);

		const careerSelect = screen.getByTestId("career-stage-select");
		await user.selectOptions(careerSelect, "Mid-career (11–20 yrs)");
		await user.click(nextButton);

		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "ai@research.edu");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);

		const submitButton = screen.getByTestId("wizard-submit-button");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("search-results-container")).toBeInTheDocument();
		});

		// Verify API was called with correct parameters
		expect(mockSearchGrants).toHaveBeenCalledWith({
			limit: 20,
			offset: 0,
			search_query: "machine learning AI",
		});
	});

	it("hides CTA section when showing results", async () => {
		const mockGrants = GrantFactory.batch(2);
		mockSearchGrants.mockResolvedValue(mockGrants);

		render(<GrantFinderClient />);

		// Initially shows CTA
		expect(screen.getByTestId("grant-finder-cta")).toBeInTheDocument();

		// Submit wizard
		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "test");

		const nextButton = screen.getByTestId("wizard-next-button");
		await user.click(nextButton);
		await user.click(nextButton);

		const institutionSelect = screen.getByTestId("institution-location-select");
		await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
		await user.click(nextButton);

		const careerSelect = screen.getByTestId("career-stage-select");
		await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
		await user.click(nextButton);

		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "test@edu.com");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);

		const submitButton = screen.getByTestId("wizard-submit-button");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.queryByTestId("grant-finder-cta")).not.toBeInTheDocument();
		});
	});

	it("returns to wizard when New Search is clicked", async () => {
		const mockGrants = GrantFactory.batch(1);
		mockSearchGrants.mockResolvedValue(mockGrants);

		render(<GrantFinderClient />);

		// Submit wizard to get to results
		const keywordsTextarea = screen.getByTestId("keywords-textarea");
		await user.type(keywordsTextarea, "biology");

		const nextButton = screen.getByTestId("wizard-next-button");
		await user.click(nextButton);
		await user.click(nextButton);

		const institutionSelect = screen.getByTestId("institution-location-select");
		await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
		await user.click(nextButton);

		const careerSelect = screen.getByTestId("career-stage-select");
		await user.selectOptions(careerSelect, "Senior (> 20 yrs)");
		await user.click(nextButton);

		const emailInput = screen.getByTestId("email-alerts-input");
		await user.type(emailInput, "bio@test.edu");

		const termsCheckbox = screen.getByTestId("terms-checkbox");
		await user.click(termsCheckbox);

		const submitButton = screen.getByTestId("wizard-submit-button");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByTestId("search-results-container")).toBeInTheDocument();
		});

		// Click New Search
		const newSearchButton = screen.getByTestId("new-search-button");
		await user.click(newSearchButton);

		// Should return to wizard
		expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
		expect(screen.queryByTestId("search-results-container")).not.toBeInTheDocument();
		expect(screen.getByTestId("grant-finder-cta")).toBeInTheDocument();
	});

	describe("Priority access link", () => {
		it("has correct href and attributes", () => {
			render(<GrantFinderClient />);

			const link = screen.getByTestId("priority-access-link");
			expect(link).toHaveAttribute("href", "mailto:hello@grantflow.ai?subject=Priority Grant Access Request");
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
			expect(link).toHaveTextContent("Get priority access");
		});

		it("only shows when not displaying search results", async () => {
			const mockGrants = GrantFactory.batch(1);
			mockSearchGrants.mockResolvedValue(mockGrants);

			render(<GrantFinderClient />);

			// Initially visible
			expect(screen.getByTestId("priority-access-link")).toBeInTheDocument();

			// Submit wizard
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "test");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
			await user.click(nextButton);

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "test@example.com");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.queryByTestId("priority-access-link")).not.toBeInTheDocument();
			});
		});
	});

	describe("State management", () => {
		it("manages showResults state correctly", async () => {
			const mockGrants = GrantFactory.batch(2);
			mockSearchGrants.mockResolvedValue(mockGrants);

			render(<GrantFinderClient />);

			// Initially not showing results
			expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
			expect(screen.queryByTestId("search-results-container")).not.toBeInTheDocument();

			// Submit to show results
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "state test");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution (no foreign component)");
			await user.click(nextButton);

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Early-stage (≤ 10 yrs)");
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "state@test.com");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.queryByTestId("search-wizard")).not.toBeInTheDocument();
				expect(screen.getByTestId("search-results-container")).toBeInTheDocument();
			});
		});

		it("manages searchParams state correctly", async () => {
			const mockGrants = GrantFactory.batch(1);
			mockSearchGrants.mockResolvedValue(mockGrants);

			render(<GrantFinderClient />);

			// Submit with specific params
			const keywordsTextarea = screen.getByTestId("keywords-textarea");
			await user.type(keywordsTextarea, "search params test");

			const nextButton = screen.getByTestId("wizard-next-button");
			await user.click(nextButton);
			await user.click(nextButton);

			const institutionSelect = screen.getByTestId("institution-location-select");
			await user.selectOptions(institutionSelect, "U.S. institution with foreign component");
			await user.click(nextButton);

			const careerSelect = screen.getByTestId("career-stage-select");
			await user.selectOptions(careerSelect, "Mid-career (11–20 yrs)");
			await user.click(nextButton);

			const emailInput = screen.getByTestId("email-alerts-input");
			await user.type(emailInput, "params@test.edu");

			const termsCheckbox = screen.getByTestId("terms-checkbox");
			await user.click(termsCheckbox);

			const submitButton = screen.getByTestId("wizard-submit-button");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockSearchGrants).toHaveBeenCalledWith({
					limit: 20,
					offset: 0,
					search_query: "search params test",
				});
			});
		});
	});

	describe("Layout and styling", () => {
		it("applies correct CSS classes", () => {
			render(<GrantFinderClient />);

			const container = screen.getByTestId("grant-finder-client");
			expect(container).toHaveClass(
				"relative",
				"overflow-hidden",
				"bg-gradient-to-br",
				"from-blue-600",
				"via-indigo-600",
				"to-purple-700",
			);
		});

		it("has proper responsive classes", () => {
			render(<GrantFinderClient />);

			const main = screen.getByTestId("grant-finder-main");
			const element = main.querySelector(".container");
			expect(element?.className.includes("mx-auto")).toBe(true);
		});
	});

	describe("Content structure", () => {
		it("contains all expected content sections", () => {
			render(<GrantFinderClient />);

			expect(screen.getByTestId("hero-background")).toBeInTheDocument();
			expect(screen.getByTestId("hero-content")).toBeInTheDocument();
			expect(screen.getByTestId("main-content")).toBeInTheDocument();
			expect(screen.getByTestId("search-wizard")).toBeInTheDocument();
		});

		it("has proper heading hierarchy", () => {
			render(<GrantFinderClient />);

			const mainTitle = screen.getByTestId("main-content-title");
			expect(mainTitle.tagName).toBe("H2");

			const heroTitle = screen.getByText("Find Grants");
			expect(heroTitle.tagName).toBe("H1");
		});

		it("includes brand badge", () => {
			render(<GrantFinderClient />);

			expect(screen.getByTestId("hero-badge")).toBeInTheDocument();
			expect(screen.getByText("GrantFlow AI")).toBeInTheDocument();
		});
	});

	describe("Decorative elements", () => {
		it("includes hero background decoration", () => {
			render(<GrantFinderClient />);

			expect(screen.getByTestId("hero-background")).toBeInTheDocument();
			expect(screen.getByTestId("hero-background")).toHaveClass(
				"absolute",
				"inset-0",
				"bg-gradient-to-br",
				"from-blue-600",
				"via-indigo-600",
				"to-purple-700",
			);
		});
	});
});
