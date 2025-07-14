import { ApplicationWithTemplateFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ResearchPlanStep } from "./research-plan-step";

// Mock the ResearchPlanPreview component to avoid DnD issues in tests
vi.mock("./research-plan-preview", () => ({
	ResearchPlanPreview: () => <div data-testid="research-plan-preview">ResearchPlanPreview</div>,
}));

describe("ResearchPlanStep", () => {
	const mockTriggerAutofill = vi.fn();
	const mockAddObjective = vi.fn();
	const mockSetShowResearchPlanInfoBanner = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset stores with complete initial state
		useApplicationStore.setState({
			application: null,
		});

		useWizardStore.setState({
			currentStep: "APPLICATION_DETAILS" as any,
			isAutofillLoading: {
				research_deep_dive: false,
				research_plan: false,
			},
			isGeneratingApplication: false,
			isGeneratingTemplate: false,
			shouldRedirectToEditor: false,
			showResearchPlanInfoBanner: true,
		});

		// Mock the actions
		useWizardStore.getState().triggerAutofill = mockTriggerAutofill;
		useWizardStore.getState().addObjective = mockAddObjective;
		useWizardStore.getState().setShowResearchPlanInfoBanner = mockSetShowResearchPlanInfoBanner;
	});

	it("renders step content", () => {
		render(<ResearchPlanStep />);

		expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
		expect(screen.getByTestId("research-plan-header")).toBeInTheDocument();
		expect(screen.getByTestId("research-plan-description")).toBeInTheDocument();
		expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
		expect(screen.getByTestId("research-plan-preview")).toBeInTheDocument();
	});

	it("renders AI autofill button", () => {
		render(<ResearchPlanStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		expect(aiButton).toBeInTheDocument();
		expect(aiButton).toHaveTextContent("Let the AI Try!");
		expect(aiButton).toBeDisabled(); // Disabled when no application
	});

	it("enables AI button when application exists", () => {
		const application = ApplicationWithTemplateFactory.build({
			rag_sources: [{ filename: "doc.pdf", sourceId: "1", status: "FINISHED" as const }],
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		expect(aiButton).not.toBeDisabled();
	});

	it("triggers autofill when AI button is clicked", async () => {
		const user = userEvent.setup();
		const application = ApplicationWithTemplateFactory.build({
			rag_sources: [{ filename: "doc.pdf", sourceId: "1", status: "FINISHED" as const }],
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		await user.click(aiButton);

		expect(mockTriggerAutofill).toHaveBeenCalledWith("research_plan");
		expect(mockTriggerAutofill).toHaveBeenCalledTimes(1);
	});

	it("shows loading state when autofill is in progress", () => {
		const application = ApplicationWithTemplateFactory.build();
		useApplicationStore.setState({ application });
		useWizardStore.setState({
			isAutofillLoading: {
				research_deep_dive: false,
				research_plan: true,
			},
		});

		render(<ResearchPlanStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		expect(aiButton).toBeDisabled();
		expect(aiButton).toHaveTextContent("Generating...");
	});

	it("renders objectives when they exist", () => {
		const application = ApplicationWithTemplateFactory.build({
			research_objectives: [
				{
					description: "Description 1",
					number: 1,
					research_tasks: [],
					title: "Test Objective 1",
				},
				{
					description: "Description 2",
					number: 2,
					research_tasks: [],
					title: "Test Objective 2",
				},
			],
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanStep />);

		expect(screen.getByTestId("research-plan-preview")).toBeInTheDocument();
	});
});
