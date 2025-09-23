import { GrantFactory } from "::testing/factories";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GrantCard } from "./grant-card";
import type { Grant } from "./types";

describe.sequential("GrantCard", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders grant card with testid", () => {
		const grant = GrantFactory.build();
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-card")).toBeInTheDocument();
	});

	it("displays grant title", () => {
		const grant = GrantFactory.build({
			title: "Test Grant Title",
		});
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-title")).toHaveTextContent("Test Grant Title");
	});

	it("displays default title when title is empty", () => {
		const grant = GrantFactory.build({ title: "" });
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-title")).toHaveTextContent("Untitled Grant Opportunity");
	});

	it("displays activity code badge when present", () => {
		const grant = GrantFactory.build({
			activity_code: "R01",
		});
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("activity-code-badge")).toHaveTextContent("R01");
		expect(screen.getByTestId("activity-code-badge")).toHaveClass("bg-blue-100", "text-blue-800");
	});

	it("does not display activity code badge when not present", () => {
		const grant = GrantFactory.build({ activity_code: "" });
		render(<GrantCard grant={grant} />);

		expect(screen.queryByTestId("activity-code-badge")).not.toBeInTheDocument();
	});

	it("displays organization name", () => {
		const grant = GrantFactory.build({
			organization: "National Cancer Institute",
		});
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-organization")).toHaveTextContent("National Cancer Institute");
	});

	it("displays default organization when not provided", () => {
		const grant = GrantFactory.build({ organization: "" });
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-organization")).toHaveTextContent("NIH");
	});

	it("displays grant description when present", () => {
		const grant = GrantFactory.build({
			description: "This is a test grant description.",
		});
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-description")).toHaveTextContent("This is a test grant description.");
	});

	it("does not display description when not present", () => {
		const grant = GrantFactory.build({
			description: undefined,
		});
		render(<GrantCard grant={grant} />);

		expect(screen.queryByTestId("grant-description")).not.toBeInTheDocument();
	});

	it("displays eligibility info when present", () => {
		const grant = GrantFactory.build({
			eligibility: "Must be US citizen",
		});
		render(<GrantCard grant={grant} />);

		expect(screen.getByTestId("grant-eligibility")).toBeInTheDocument();
		expect(screen.getByTestId("grant-eligibility")).toHaveTextContent("Eligibility criteria apply");
	});

	it("does not display eligibility info when not present", () => {
		const grant = GrantFactory.build({
			eligibility: undefined,
		});
		render(<GrantCard grant={grant} />);

		expect(screen.queryByTestId("grant-eligibility")).not.toBeInTheDocument();
	});

	it("displays View Details link when URL is present", () => {
		const grant = GrantFactory.build({
			url: "https://grants.nih.gov/test",
		});
		render(<GrantCard grant={grant} />);

		const link = screen.getByTestId("grant-view-details-link");
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "https://grants.nih.gov/test");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(link).toHaveTextContent("View Details");
	});

	it("does not display View Details link when URL is not present", () => {
		const grant = GrantFactory.build({ url: undefined });
		render(<GrantCard grant={grant} />);

		expect(screen.queryByTestId("grant-view-details-link")).not.toBeInTheDocument();
	});

	describe("Deadline formatting", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("displays 'Ongoing' when deadline is not provided", () => {
			const grant = GrantFactory.build({
				deadline: undefined,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("Ongoing");
		});

		it("displays 'Today' when deadline is today", () => {
			const grant = GrantFactory.build({
				deadline: "2024-01-15T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("Today");
		});

		it("displays 'Tomorrow' when deadline is tomorrow", () => {
			const grant = GrantFactory.build({
				deadline: "2024-01-16T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("Tomorrow");
		});

		it("displays days when deadline is within a week", () => {
			const grant = GrantFactory.build({
				deadline: "2024-01-20T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("5 days");
		});

		it("displays weeks when deadline is within a month", () => {
			const grant = GrantFactory.build({
				deadline: "2024-02-05T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("weeks");
		});

		it("displays formatted date when deadline is far in future", () => {
			const grant = GrantFactory.build({
				deadline: "2024-06-15T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("Jun 15, 2024");
		});

		it("displays 'Expired' when deadline is in the past", () => {
			const grant = GrantFactory.build({
				deadline: "2024-01-10T23:59:59Z",
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-deadline")).toHaveTextContent("Expired");
		});

		it("applies correct color classes based on deadline", () => {
			const urgentGrant = GrantFactory.build({
				deadline: "2024-01-20T23:59:59Z",
			});
			const { rerender } = render(<GrantCard grant={urgentGrant} />);
			let deadlineElement = screen.getByTestId("grant-deadline").querySelector(".font-medium");
			expect(deadlineElement).toHaveClass("text-red-600");

			const approachingGrant = GrantFactory.build({
				deadline: "2024-02-10T23:59:59Z",
			});
			rerender(<GrantCard grant={approachingGrant} />);
			deadlineElement = screen.getByTestId("grant-deadline").querySelector(".font-medium");
			expect(deadlineElement).toHaveClass("text-orange-600");

			const distantGrant = GrantFactory.build({
				deadline: "2024-06-15T23:59:59Z",
			});
			rerender(<GrantCard grant={distantGrant} />);
			deadlineElement = screen.getByTestId("grant-deadline").querySelector(".font-medium");
			expect(deadlineElement).toHaveClass("text-green-600");

			const expiredGrant = GrantFactory.build({
				deadline: "2024-01-10T23:59:59Z",
			});
			rerender(<GrantCard grant={expiredGrant} />);
			deadlineElement = screen.getByTestId("grant-deadline").querySelector(".font-medium");
			expect(deadlineElement).toHaveClass("text-gray-400");
		});
	});

	describe("Amount formatting", () => {
		it("displays amount range when both min and max are provided", () => {
			const grant = GrantFactory.build({
				amount_max: 500_000,
				amount_min: 100_000,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-funding")).toHaveTextContent("$100,000 - $500,000");
		});

		it("displays minimum amount with plus when only min is provided", () => {
			const grant = GrantFactory.build({
				amount_max: undefined,
				amount_min: 250_000,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-funding")).toHaveTextContent("$250,000+");
		});

		it("displays maximum amount with 'Up to' when only max is provided", () => {
			const grant = GrantFactory.build({
				amount_max: 750_000,
				amount_min: undefined,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-funding")).toHaveTextContent("Up to $750,000");
		});

		it("displays 'Amount varies' when neither min nor max are provided", () => {
			const grant = GrantFactory.build({
				amount_max: undefined,
				amount_min: undefined,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-funding")).toHaveTextContent("Amount varies");
		});

		it("formats amounts with thousand separators", () => {
			const grant = GrantFactory.build({
				amount_max: 2_500_000,
				amount_min: 1_000_000,
			});
			render(<GrantCard grant={grant} />);

			expect(screen.getByTestId("grant-funding")).toHaveTextContent("$1,000,000 - $2,500,000");
		});
	});

	describe("Required fields", () => {
		it("handles grant with minimal required fields", () => {
			const minimalGrant: Grant = {
				activity_code: "R01",
				clinical_trials: "Optional",
				document_number: "12345",
				document_type: "Notice",
				expired_date: "2025-12-31T23:59:59Z",
				id: "test-id",
				organization: "NIH",
				parent_organization: "HHS",
				participating_orgs: "NIH",
				release_date: "2024-01-01T00:00:00Z",
				title: "Test Grant",
				url: "https://grants.nih.gov/test",
			};

			render(<GrantCard grant={minimalGrant} />);

			expect(screen.getByTestId("grant-card")).toBeInTheDocument();
			expect(screen.getByTestId("grant-title")).toHaveTextContent("Test Grant");
			expect(screen.getByTestId("activity-code-badge")).toHaveTextContent("R01");
			expect(screen.getByTestId("grant-organization")).toHaveTextContent("NIH");
		});
	});

	describe("Accessibility", () => {
		it("has proper link attributes for external URL", () => {
			const grant = GrantFactory.build({
				url: "https://grants.nih.gov/test",
			});
			render(<GrantCard grant={grant} />);

			const link = screen.getByTestId("grant-view-details-link");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
			expect(link).toHaveAttribute("target", "_blank");
		});

		it("has proper semantic structure", () => {
			const grant = GrantFactory.build({
				title: "Test Grant",
			});
			render(<GrantCard grant={grant} />);

			const title = screen.getByTestId("grant-title");
			expect(title.tagName).toBe("H3");

			expect(title).toHaveClass("text-lg", "font-semibold");
		});
	});

	describe("Visual styling", () => {
		it("applies hover shadow effect", () => {
			const grant = GrantFactory.build();
			render(<GrantCard grant={grant} />);

			const card = screen.getByTestId("grant-card");
			expect(card).toHaveClass("transition-shadow", "hover:shadow-md");
		});

		it("has proper spacing and layout classes", () => {
			const grant = GrantFactory.build();
			render(<GrantCard grant={grant} />);

			const card = screen.getByTestId("grant-card");
			expect(card).toHaveClass("rounded-lg", "border", "border-gray-200", "bg-white", "p-6");
		});

		it("has proper grid layout for grant details", () => {
			const grant = GrantFactory.build();
			render(<GrantCard grant={grant} />);

			const details = screen.getByTestId("grant-details");
			expect(details).toHaveClass("mb-4", "grid", "gap-3", "sm:grid-cols-2");
		});
	});

	describe("Content truncation", () => {
		it("applies line clamp to description", () => {
			const longDescription =
				"This is a very long description that should be truncated to three lines maximum. ".repeat(10);
			const grant = GrantFactory.build({
				description: longDescription,
			});
			render(<GrantCard grant={grant} />);

			const description = screen.getByTestId("grant-description");
			expect(description).toHaveClass("line-clamp-3");
		});
	});
});
