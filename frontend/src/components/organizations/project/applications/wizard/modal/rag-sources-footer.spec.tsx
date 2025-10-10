import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
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

	describe("Template Source Type (with onBackToUploads)", () => {
		it("renders both buttons", () => {
			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

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

		it("calls onContinue when Continue button is clicked", () => {
			const mockOnContinue = vi.fn();

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							status: "FINISHED",
						}),
					],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} onContinue={mockOnContinue} />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			fireEvent.click(continueButton!);

			expect(mockOnContinue).toHaveBeenCalledOnce();
		});

		it("disables Continue button when no sources exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).toBeDisabled();
		});

		it("disables Continue button when all sources have failed", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FAILED" }),
						RagSourceFactory.build({ status: "FAILED" }),
					],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).toBeDisabled();
		});

		it("enables Continue button when at least one source is successful", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FINISHED" }),
						RagSourceFactory.build({ status: "FAILED" }),
					],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).not.toBeDisabled();
		});

		it("renders with space-between layout", () => {
			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

			const footerContainer = container.querySelector('[data-testid="rag-sources-footer"]');
			expect(footerContainer).toHaveStyle({ justifyContent: "space-between" });
		});

		it("renders buttons with correct styling", () => {
			const { container } = render(<RagSourcesFooter onBackToUploads={vi.fn()} />);

			const backButton = container.querySelector('[data-testid="back-to-uploads-button"]');
			const continueButton = container.querySelector('[data-testid="continue-button"]');

			expect(backButton).toHaveAttribute("type", "button");
			expect(continueButton).toHaveAttribute("type", "button");
		});
	});

	describe("Application Source Type (without onBackToUploads)", () => {
		it("does NOT render Back to Uploads button", () => {
			const { container } = render(<RagSourcesFooter />);

			expect(container.querySelector('[data-testid="back-to-uploads-button"]')).not.toBeInTheDocument();
		});

		it("renders only Continue button", () => {
			const { container } = render(<RagSourcesFooter />);

			expect(container.querySelector('[data-testid="continue-button"]')).toBeInTheDocument();
		});

		it("Continue button is NEVER disabled even with no sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).not.toBeDisabled();
		});

		it("Continue button is NEVER disabled even when all sources failed", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({ status: "FAILED" }),
						RagSourceFactory.build({ status: "FAILED" }),
					],
				}),
			});

			useApplicationStore.setState({ application });

			const { container } = render(<RagSourcesFooter />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).not.toBeDisabled();
		});

		it("calls onContinue when Continue button is clicked", () => {
			const mockOnContinue = vi.fn();

			const { container } = render(<RagSourcesFooter onContinue={mockOnContinue} />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			fireEvent.click(continueButton!);

			expect(mockOnContinue).toHaveBeenCalledOnce();
		});

		it("renders with flex-end layout", () => {
			const { container } = render(<RagSourcesFooter />);

			const footerContainer = container.querySelector('[data-testid="rag-sources-footer"]');
			expect(footerContainer).toHaveStyle({ justifyContent: "flex-end" });
		});

		it("Continue button text is always 'Continue'", () => {
			const { container } = render(<RagSourcesFooter />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');
			expect(continueButton).toHaveTextContent("Continue");
		});

		it("handles missing callback functions gracefully", () => {
			const { container } = render(<RagSourcesFooter />);

			const continueButton = container.querySelector('[data-testid="continue-button"]');

			fireEvent.click(continueButton!);

			expect(true).toBe(true);
		});
	});
});
