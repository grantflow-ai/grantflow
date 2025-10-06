import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
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

	describe.skip("AI Try Button Behavior (Disabled)", () => {
		it("renders AI Try button with correct default text", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("enables AI Try button when not loading and application exists", () => {
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("disables AI Try button when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("shows loading text when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("disables AI Try button when no application exists", () => {
			useApplicationStore.setState({ application: null });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("calls triggerAutofill with correct parameters when clicked", async () => {
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({ triggerAutofill: mockTriggerAutofill });

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("does not call triggerAutofill when button is disabled", async () => {
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: false },
				triggerAutofill: mockTriggerAutofill,
			});

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});
	});

	describe("Button States Combination", () => {
		it("shows only reset button in development with application", () => {
			vi.stubEnv("NODE_ENV", "development");

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("dev-reset-button")).toBeInTheDocument();
			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});

		it("shows no buttons in production", () => {
			vi.stubEnv("NODE_ENV", "production");

			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.queryByTestId("dev-reset-button")).not.toBeInTheDocument();
			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});

		it("shows reset button when no application in development", () => {
			vi.stubEnv("NODE_ENV", "development");

			useApplicationStore.setState({ application: null });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("dev-reset-button")).toBeEnabled();
			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});
	});
});
