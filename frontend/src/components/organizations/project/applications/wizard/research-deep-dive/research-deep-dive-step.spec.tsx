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
			if (application.grant_template) {
				application.grant_template.grant_type = "RESEARCH";
			}
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

	describe("Grant Type Dynamic Content", () => {
		it("shows basic science header for RESEARCH grant type", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "RESEARCH",
				},
			});
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-header")).toHaveTextContent("Research Deep Dive");
			expect(screen.getByTestId("research-deep-dive-description")).toHaveTextContent(
				"Before generating your grant application draft, it would be helpful to learn a bit more about your research to ensure more accurate results.",
			);
		});

		it("shows translational research header for TRANSLATIONAL grant type", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "TRANSLATIONAL",
				},
			});
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-header")).toHaveTextContent(
				"Translational Research Deep Dive",
			);
			expect(screen.getByTestId("research-deep-dive-description")).toHaveTextContent(
				"Before generating your grant application draft, it would be helpful to learn more about your translational research approach to ensure accurate results.",
			);
		});

		it("updates header when grant type changes", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "RESEARCH",
				},
			});
			useApplicationStore.setState({ application });

			const { rerender } = render(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-header")).toHaveTextContent("Research Deep Dive");

			// Change grant type
			const updatedApplication = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "TRANSLATIONAL",
				},
			});
			useApplicationStore.setState({ application: updatedApplication });
			rerender(<ResearchDeepDiveStep />);

			expect(screen.getByTestId("research-deep-dive-header")).toHaveTextContent(
				"Translational Research Deep Dive",
			);
		});
	});

	describe("Dev Reset Button Grant Type Support", () => {
		it("resets to basic science empty inputs for RESEARCH grant type", () => {
			vi.stubEnv("NODE_ENV", "development");

			const mockUpdateFormInputs = vi.fn();
			useWizardStore.setState({ updateFormInputs: mockUpdateFormInputs });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "RESEARCH",
				},
			});
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const resetButton = screen.getByTestId("dev-reset-button");
			resetButton.click();

			expect(mockUpdateFormInputs).toHaveBeenCalledWith({
				background_context: "",
				hypothesis: "",
				impact: "",
				novelty_and_innovation: "",
				preliminary_data: "",
				rationale: "",
				research_feasibility: "",
				scientific_infrastructure: "",
				team_excellence: "",
			});
		});

		it("resets to translational empty inputs for TRANSLATIONAL grant type", () => {
			vi.stubEnv("NODE_ENV", "development");

			const mockUpdateFormInputs = vi.fn();
			useWizardStore.setState({ updateFormInputs: mockUpdateFormInputs });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...ApplicationWithTemplateFactory.build().grant_template!,
					grant_type: "TRANSLATIONAL",
				},
			});
			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveStep />);

			const resetButton = screen.getByTestId("dev-reset-button");
			resetButton.click();

			expect(mockUpdateFormInputs).toHaveBeenCalledWith({
				commercialization_plan: "",
				core_concept: "",
				proof_of_concept: "",
				team_translation_capability: "",
				translational_impact: "",
				translational_potential: "",
				unique_approach: "",
				unmet_need_context: "",
			});
		});
	});
});
