import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationWithTemplateFactory,
	GetOrganizationResponseFactory,
	ListOrganizationsResponseFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";

import { MAX_OBJECTIVES, ResearchPlanStep } from "./research-plan-step";

vi.mock("@/actions/grant-applications", () => ({
	updateApplication: vi.fn().mockResolvedValue({
		id: "test-app-id",
		project_id: "test-project-id",
		research_objectives: [],
	}),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("./research-plan-preview", () => ({
	ResearchPlanPreview: () => <div data-testid="research-plan-preview-mock">ResearchPlanPreview Mock</div>,
}));

vi.mock("../shared/preview-loading", () => ({
	PreviewLoadingComponent: () => <div data-testid="preview-loading-mock">PreviewLoading Mock</div>,
}));

vi.mock("../shared/objective-form", () => ({
	ObjectiveForm: ({
		objectiveNumber,
		onSaveAction,
	}: {
		objectiveNumber: number;
		onSaveAction: (data: {
			description: string;
			name: string;
			tasks: { description: string; id: string }[];
		}) => void;
	}) => (
		<div data-testid="objective-form-mock">
			<span data-testid="objective-number">Objective {objectiveNumber}</span>
			<button
				data-testid="mock-save-objective"
				onClick={() =>
					onSaveAction({
						description: "Test objective description",
						name: "Test objective name",
						tasks: [{ description: "Test task description", id: "test-id" }],
					})
				}
				type="button"
			>
				Save Mock Objective
			</button>
		</div>
	),
}));

function renderResearchPlanStep() {
	const mockDialogRef = { current: { close: vi.fn(), open: vi.fn() } };
	return render(<ResearchPlanStep dialogRef={mockDialogRef} />);
}

describe.sequential("ResearchPlanStep", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();

		const organization = GetOrganizationResponseFactory.build();
		const organizations = ListOrganizationsResponseFactory.build();
		useOrganizationStore.setState({
			organization,
			organizations,
			selectedOrganizationId: organization.id,
		});
	});

	afterEach(() => {
		cleanup();

		useWizardStore.setState({
			isAutofillLoading: { research_deep_dive: false, research_plan: false },
			showResearchPlanInfoBanner: true,
		});
	});

	describe("Component Structure", () => {
		it("renders main container", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
		});

		it("renders header section with correct content", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-header")).toHaveTextContent("Research plan");
			expect(screen.getByTestId("research-plan-description")).toHaveTextContent(
				"Define your key objectives and break them into actionable tasks. This structure forms the backbone of your application.",
			);
		});

		it("renders left pane with correct test id", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-left-pane")).toBeInTheDocument();
		});
	});

	describe("Objective Form Toggle State", () => {
		it("shows add objective button initially when no form is open", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
			expect(screen.queryByTestId("objective-form-mock")).not.toBeInTheDocument();
		});

		it("hides add objective button when form is shown", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			expect(screen.queryByTestId("add-objective-button")).not.toBeInTheDocument();
			expect(screen.getByTestId("objective-form-mock")).toBeInTheDocument();
		});

		it("shows objective form when add objective button is clicked", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			expect(screen.getByTestId("objective-form-mock")).toBeInTheDocument();
		});

		it("hides objective form after successful save", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("mock-save-objective");
			await user.click(saveButton);

			expect(screen.queryByTestId("objective-form-mock")).not.toBeInTheDocument();
			expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
		});
	});

	describe("Add Objective Button Behavior", () => {
		it("shows 'Add First Objective' text when no objectives exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toHaveTextContent("Add First Objective");
		});

		it("shows 'Add Objective' text when objectives exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [ResearchObjectiveFactory.build()],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toHaveTextContent("Add Objective");
		});

		it("enables add objective button when below maximum", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES - 1 }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toBeEnabled();
		});

		it("disables add objective button when at maximum objectives", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toBeDisabled();
		});

		it("disables add objective button when exceeding maximum objectives", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES + 1 }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toBeDisabled();
		});
	});

	describe("AI Try Button Behavior", () => {
		it("renders AI Try button with correct default text", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const aiButton = screen.getByTestId("ai-try-button");
			expect(aiButton).toHaveTextContent("Let the AI Try!");
		});

		it("enables AI Try button when not loading and application exists", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("ai-try-button")).toBeEnabled();
		});

		it("disables AI Try button when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: true },
			});

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("ai-try-button")).toBeDisabled();
		});

		it("shows loading text when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: true },
			});

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("ai-try-button")).toHaveTextContent("Generating...");
		});

		it("disables AI Try button when no application exists", () => {
			useApplicationStore.setState({ application: null });

			renderResearchPlanStep();

			expect(screen.getByTestId("ai-try-button")).toBeDisabled();
		});

		it("calls triggerAutofill with correct parameters when clicked", async () => {
			const user = userEvent.setup();
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({ triggerAutofill: mockTriggerAutofill });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const aiButton = screen.getByTestId("ai-try-button");
			await user.click(aiButton);

			expect(mockTriggerAutofill).toHaveBeenCalledWith("research_plan");
		});
	});

	describe("Info Banner Conditional Display", () => {
		it("shows info banner when flag is true and at maximum objectives", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(
				screen.getByText("You can add up to a maximum of 5 objectives for your grant application."),
			).toBeInTheDocument();
		});

		it("hides info banner when flag is false even at maximum objectives", () => {
			useWizardStore.setState({
				showResearchPlanInfoBanner: false,
			});

			const objectives = Array.from({ length: MAX_OBJECTIVES }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(
				screen.queryByText("You can add up to a maximum of 5 objectives for your grant application."),
			).not.toBeInTheDocument();
		});

		it("hides info banner when below maximum objectives even if flag is true", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES - 1 }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(
				screen.queryByText("You can add up to a maximum of 5 objectives for your grant application."),
			).not.toBeInTheDocument();
		});

		it("calls setShowResearchPlanInfoBanner when close button is clicked", async () => {
			const user = userEvent.setup();
			const mockSetShowResearchPlanInfoBanner = vi.fn();

			useWizardStore.setState({
				setShowResearchPlanInfoBanner: mockSetShowResearchPlanInfoBanner,
				showResearchPlanInfoBanner: true,
			});

			const objectives = Array.from({ length: MAX_OBJECTIVES }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const closeButton = screen.getByLabelText("Close info banner");
			await user.click(closeButton);

			expect(mockSetShowResearchPlanInfoBanner).toHaveBeenCalledWith(false);
		});
	});

	describe("Preview Switching Logic", () => {
		it("shows ResearchPlanPreview when not loading", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-preview-mock")).toBeInTheDocument();
			expect(screen.queryByTestId("preview-loading-mock")).not.toBeInTheDocument();
		});

		it("shows PreviewLoadingComponent when autofill is loading", () => {
			useWizardStore.setState({
				isAutofillLoading: { research_deep_dive: true, research_plan: true },
			});

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("preview-loading-mock")).toBeInTheDocument();
			expect(screen.queryByTestId("research-plan-preview-mock")).not.toBeInTheDocument();
		});
	});

	describe("Objective Creation Logic", () => {
		it("passes correct objective number to ObjectiveForm", async () => {
			const user = userEvent.setup();
			const existingObjectives = [ResearchObjectiveFactory.build(), ResearchObjectiveFactory.build()];
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: existingObjectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			expect(screen.getByTestId("objective-number")).toHaveTextContent("Objective 3");
		});

		it("calls createObjective with correctly formatted objective data", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn();

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("mock-save-objective");
			await user.click(saveButton);

			expect(mockCreateObjective).toHaveBeenCalledWith({
				description: "Test objective description",
				number: 1,
				research_tasks: [
					{
						description: "Test task description",
						number: 1,
						title: "",
					},
				],
				title: "Test objective name",
			});
		});

		it("calculates correct objective number based on existing objectives", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn();

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const existingObjectives = Array.from({ length: 3 }, (_, i) =>
				ResearchObjectiveFactory.build({ number: i + 1 }),
			);
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: existingObjectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("mock-save-objective");
			await user.click(saveButton);

			expect(mockCreateObjective).toHaveBeenCalledWith(
				expect.objectContaining({
					number: 4,
				}),
			);
		});

		it("properly maps task data with correct numbering", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn();

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("add-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("mock-save-objective");
			await user.click(saveButton);

			expect(mockCreateObjective).toHaveBeenCalledWith(
				expect.objectContaining({
					research_tasks: [
						{
							description: "Test task description",
							number: 1,
							title: "",
						},
					],
				}),
			);
		});
	});

	describe("Edge Cases", () => {
		it("handles undefined research_objectives gracefully", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: undefined as any,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("add-objective-button")).toHaveTextContent("Add First Objective");
			expect(screen.getByTestId("add-objective-button")).toBeEnabled();
		});

		it("handles null application gracefully", () => {
			useApplicationStore.setState({ application: null });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
			expect(screen.getByTestId("ai-try-button")).toBeDisabled();
		});
	});
});
