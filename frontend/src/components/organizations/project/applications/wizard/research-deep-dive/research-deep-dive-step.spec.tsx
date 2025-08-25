import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ResearchDeepDiveStep } from "./research-deep-dive-step";

vi.mock("./research-deep-dive-content", () => ({
	ResearchDeepDiveContent: () => (
		<div data-testid="research-deep-dive-content-mock">ResearchDeepDiveContent Mock</div>
	),
}));

describe.sequential("ResearchDeepDiveStep", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();

		useWizardStore.setState({
			isAutofillLoading: { research_deep_dive: true, research_plan: true },
		});
	});

	describe("Component Structure", () => {
		it("renders main container with correct layout", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-step")).toBeInTheDocument();
			expect(screen.getByTestId("research-deep-dive-step")).toHaveClass("flex flex-col h-full");
		});

		it("renders header section with correct content", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-header")).toHaveTextContent("Research Deep Dive");
			expect(screen.getByTestId("research-deep-dive-description")).toHaveTextContent(
				"Before generating your grant application draft, it would be helpful to learn a bit more about your research to ensure more accurate results.",
			);
		});

		it("renders ResearchDeepDiveContent component", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-content-mock")).toBeInTheDocument();
		});
	});

	describe("AI Try Button Behavior", () => {
		it("renders AI Try button with correct default text", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toBeInTheDocument();
			expect(aiButton).toHaveTextContent("Let the AI Try!");
		});

		it("enables AI Try button when not loading and application exists", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toBeEnabled();
		});

		it("disables AI Try button when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toBeDisabled();
		});

		it("shows loading text when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toHaveTextContent("Generating...");
		});

		it("disables AI Try button when no application exists", () => {
			useApplicationStore.setState({ application: null });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toBeDisabled();
		});

		it("calls triggerAutofill with correct parameters when clicked", async () => {
			const user = userEvent.setup();
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({ triggerAutofill: mockTriggerAutofill });

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			await user.click(aiButton);

			expect(mockTriggerAutofill).toHaveBeenCalledWith("research_deep_dive");
		});

		it("does not call triggerAutofill when button is disabled", async () => {
			const user = userEvent.setup();
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
				triggerAutofill: mockTriggerAutofill,
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.getByTestId("ai-try-button");
			await user.click(aiButton);

			expect(mockTriggerAutofill).not.toHaveBeenCalled();
		});
	});

	describe("Button States Combination", () => {
		it("shows both buttons in development with application", () => {
			vi.stubEnv("NODE_ENV", "development");

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("dev-reset-button")).toBeInTheDocument();
			expect(screen.getByTestId("ai-try-button")).toBeInTheDocument();
		});

		it("shows only AI button in production", () => {
			vi.stubEnv("NODE_ENV", "production");

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.queryByTestId("dev-reset-button")).not.toBeInTheDocument();
			expect(screen.getByTestId("ai-try-button")).toBeInTheDocument();
		});

		it("disables AI button but enables reset button when no application in development", () => {
			vi.stubEnv("NODE_ENV", "development");

			useApplicationStore.setState({ application: null });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("dev-reset-button")).toBeEnabled();
			expect(screen.getByTestId("ai-try-button")).toBeDisabled();
		});
	});

	describe("Header Layout and Styling", () => {
		it("applies correct CSS classes to main container", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const container = screen.getByTestId("research-deep-dive-step");
			expect(container).toHaveClass(
				"flex",
				"flex-col",
				"h-full",
				"bg-preview-bg",
				"space-y-6",
				"overflow-y-auto",
			);
		});

		it("applies correct responsive padding classes", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const container = screen.getByTestId("research-deep-dive-step");
			expect(container).toHaveClass("lg:px-6", "lg:pt-6", "md:px-4", "md:pt-4", "px-3", "pt-3");
		});

		it("renders header with correct typography classes", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const header = screen.getByTestId("research-deep-dive-header");
			expect(header).toHaveClass("text-app-black", "text-3xl", "font-medium", "font-heading", "leading-loose");

			const description = screen.getByTestId("research-deep-dive-description");
			expect(description).toHaveClass("text-app-black", "font-normal", "text-base", "leading-tight", "-mt-2");
		});
	});
});
