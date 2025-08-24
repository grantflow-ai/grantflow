import { ApplicationWithTemplateFactory } from "::testing/factories";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { RagSourcesFooter } from "./rag-sources-footer";

describe.sequential("RagSourcesFooter", () => {
	beforeEach(() => {
		const application = ApplicationWithTemplateFactory.build();
		useApplicationStore.setState({ application });
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		useApplicationStore.setState({ application: null });
	});

	it("renders both buttons", () => {
		const { container } = render(<RagSourcesFooter />);

		expect(container.querySelector('[data-testid="back-to-uploads-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="continue-button"]')).toBeInTheDocument();
	});

	it("calls onBackToUploads when Back to Uploads button is clicked", () => {
		const mockOnBackToUploads = vi.fn();

		const { container } = render(<RagSourcesFooter onBackToUploads={mockOnBackToUploads} />);

		const backButton = container.querySelector('[data-testid="back-to-uploads-button"]');
		expect(backButton).toBeInTheDocument();

		fireEvent.click(backButton!);

		expect(mockOnBackToUploads).toHaveBeenCalledOnce();
	});

	it("handles missing callback functions gracefully", () => {
		const { container } = render(<RagSourcesFooter />);

		const backButton = container.querySelector('[data-testid="back-to-uploads-button"]');
		const continueButton = container.querySelector('[data-testid="continue-button"]');

		fireEvent.click(backButton!);
		fireEvent.click(continueButton!);

		expect(true).toBe(true);
	});

	it("renders buttons with correct styling", () => {
		const { container } = render(<RagSourcesFooter />);

		const backButton = container.querySelector('[data-testid="back-to-uploads-button"]');
		const continueButton = container.querySelector('[data-testid="continue-button"]');

		expect(backButton).toHaveAttribute("type", "button");
		expect(continueButton).toHaveAttribute("type", "button");
	});

	it("renders with correct layout structure", () => {
		const { container } = render(<RagSourcesFooter />);

		const footerContainer = container.querySelector('[data-testid="rag-sources-footer"]');
		expect(footerContainer).toHaveClass("flex", "w-full", "justify-between", "items-center");
	});
});
