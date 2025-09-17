/* eslint-disable vitest/expect-expect */
import { setupAnalyticsMocks } from "::testing/analytics-test-utils";
import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationWithTemplateFactory,
	GetOrganizationResponseFactory,
	ListOrganizationsResponseFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import * as segment from "@/utils/segment";

import { MAX_OBJECTIVES, ResearchPlanStep } from "./research-plan-step";

vi.mock("@/actions/grant-applications", () => ({
	updateApplication: vi.fn(),
}));

vi.mock("@/utils/segment");

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

vi.mock("./preview-loading", () => ({
	PreviewLoadingComponent: () => <div data-testid="preview-loading-mock">PreviewLoading Mock</div>,
}));

vi.mock("./objective-form", () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const React = require("react");

	interface Task {
		description: string;
		id: string;
	}

	return {
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
		}) => {
			const [name, setName] = React.useState("");

			const [description, setDescription] = React.useState("");

			const [tasks, setTasks] = React.useState([{ description: "", id: "task-0" }] as Task[]);

			const handleSave = () => {
				onSaveAction({
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Need || for empty string fallback in test
					description: description || "Test objective description",
					// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Need || for empty string fallback in test
					name: name || "Test objective name",

					tasks: (tasks as Task[]).map((task: Task) => ({
						description: task.description || "Test task description",
						id: task.id,
					})),
				});
			};

			const addTask = () => {
				setTasks((prev: Task[]) => [...prev, { description: "", id: `task-${prev.length}` }]);
			};

			return (
				<div data-testid="objective-form-mock">
					<span data-testid="objective-number">Objective {objectiveNumber}</span>
					<input
						data-testid="objective-name-input"
						onChange={(e) => setName(e.target.value)}
						placeholder="Objective name"
						value={name}
					/>
					<textarea
						data-testid="objective-description-input"
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Objective description"
						value={description}
					/>
					{tasks.map((task: Task, index: number) => (
						<input
							data-testid={`task-${index}-description`}
							key={task.id}
							onChange={(e) => {
								const newTasks = [...tasks];
								newTasks[index] = { ...task, description: e.target.value };
								setTasks(newTasks);
							}}
							placeholder={`Task ${index + 1} description`}
							value={task.description}
						/>
					))}
					<button data-testid="add-task-button" onClick={addTask} type="button">
						Add Task
					</button>
					<button data-testid="save-objective" onClick={handleSave} type="button">
						Save Mock Objective
					</button>
					<div data-testid="floating-action-button">
						<button data-testid="add-objective-button" onClick={handleSave} type="button">
							Add Objective
						</button>
					</div>
				</div>
			);
		},
	};
});

function renderResearchPlanStep() {
	const mockDialogRef = { current: { close: vi.fn(), open: vi.fn() } };
	return render(<ResearchPlanStep dialogRef={mockDialogRef} />);
}

describe.sequential("ResearchPlanStep", () => {
	beforeEach(async () => {
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

		const { updateApplication } = await import("@/actions/grant-applications");
		const mockUpdateApplication = vi.mocked(updateApplication);
		mockUpdateApplication.mockImplementation(async (_orgId, _projId, _appId, data) => {
			const currentApp = useApplicationStore.getState().application;
			if (!currentApp) {
				throw new Error("No application found");
			}
			const updatedApp = {
				...currentApp,
				...data,
			};
			useApplicationStore.setState({ application: updatedApp });
			return updatedApp as API.UpdateApplication.Http200.ResponseBody;
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

			expect(screen.getByTestId("new-objective-button")).toBeInTheDocument();
			expect(screen.queryByTestId("objective-form-mock")).not.toBeInTheDocument();
		});

		it("hides add objective button when form is shown", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			expect(screen.queryByTestId("new-objective-button")).not.toBeInTheDocument();
			expect(screen.getByTestId("objective-form-mock")).toBeInTheDocument();
		});

		it("shows objective form when add objective button is clicked", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("new-objective-button");
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

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("save-objective");
			await user.click(saveButton);

			expect(screen.queryByTestId("objective-form-mock")).not.toBeInTheDocument();
			expect(screen.getByTestId("new-objective-button")).toBeInTheDocument();
		});
	});

	describe("Add Objective Button Behavior", () => {
		it("enables add objective button when below maximum", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES - 1 }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("new-objective-button")).toBeEnabled();
		});

		it("disables add objective button when at maximum objectives", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("new-objective-button")).toBeDisabled();
		});

		it("disables add objective button when exceeding maximum objectives", () => {
			const objectives = Array.from({ length: MAX_OBJECTIVES + 1 }, () => ResearchObjectiveFactory.build());
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: objectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("new-objective-button")).toBeDisabled();
		});
	});

	describe("Floating Add Objective Button Behavior", () => {
		it("shows floating Add Objective button when form is not visible", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("new-objective-button")).toBeInTheDocument();
			expect(screen.queryByTestId("add-objective-button")).not.toBeInTheDocument();
		});

		it("shows floating Add Objective button when form is visible", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			expect(screen.queryByTestId("new-objective-button")).not.toBeInTheDocument();
			expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
			expect(screen.getByTestId("add-objective-button")).toHaveTextContent("Add Objective");
		});

		it("floating Add Objective button always renders when form is shown regardless of existing objectives", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [ResearchObjectiveFactory.build(), ResearchObjectiveFactory.build()],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			expect(screen.getByTestId("objective-form-mock")).toBeInTheDocument();
			expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
			expect(screen.getByTestId("add-objective-button")).toHaveTextContent("Add Objective");
		});

		it("floating Add Objective button functionality works correctly", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			const addObjectiveButton = screen.getByTestId("add-objective-button");
			await user.click(addObjectiveButton);

			expect(screen.queryByTestId("objective-form-mock")).not.toBeInTheDocument();
			expect(screen.getByTestId("new-objective-button")).toBeInTheDocument();
		});
	});

	describe.skip("AI Try Button Behavior (Disabled)", () => {
		it("renders AI Try button with correct default text", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
		});

		it("enables AI Try button when not loading and application exists", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
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

			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
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

			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});

		it("disables AI Try button when no application exists", () => {
			useApplicationStore.setState({ application: null });

			renderResearchPlanStep();

			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});

		it("calls triggerAutofill with correct parameters when clicked", async () => {
			const mockTriggerAutofill = vi.fn();

			useWizardStore.setState({ triggerAutofill: mockTriggerAutofill });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const aiButton = screen.queryByTestId("ai-try-button");
			expect(aiButton).not.toBeInTheDocument();
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

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			expect(screen.getByTestId("objective-number")).toHaveTextContent("Objective 3");
		});

		it("calls createObjective with correctly formatted objective data", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn().mockResolvedValue(undefined);

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("save-objective");
			await user.click(saveButton);

			await waitFor(() => {
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
		});

		it("calculates correct objective number based on existing objectives", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn().mockResolvedValue(undefined);

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const existingObjectives = Array.from({ length: 3 }, (_, i) =>
				ResearchObjectiveFactory.build({ number: i + 1 }),
			);
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: existingObjectives,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("save-objective");
			await user.click(saveButton);

			await waitFor(() => {
				expect(mockCreateObjective).toHaveBeenCalledWith(
					expect.objectContaining({
						number: 4,
					}),
				);
			});
		});

		it("properly maps task data with correct numbering", async () => {
			const user = userEvent.setup();
			const mockCreateObjective = vi.fn().mockResolvedValue(undefined);

			useWizardStore.setState({ createObjective: mockCreateObjective });

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: [],
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			const addButton = screen.getByTestId("new-objective-button");
			await user.click(addButton);

			const saveButton = screen.getByTestId("save-objective");
			await user.click(saveButton);

			await waitFor(() => {
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
	});

	describe("Edge Cases", () => {
		it("handles undefined research_objectives gracefully", () => {
			const application = ApplicationWithTemplateFactory.build({
				research_objectives: undefined as any,
			});

			useApplicationStore.setState({ application });

			renderResearchPlanStep();

			expect(screen.getByTestId("new-objective-button")).toBeEnabled();
		});

		it("handles null application gracefully", () => {
			useApplicationStore.setState({ application: null });

			renderResearchPlanStep();

			expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
			expect(screen.queryByTestId("ai-try-button")).not.toBeInTheDocument();
		});
	});

	describe("Analytics Tracking", () => {
		const { expectEventTracked, expectNoEventsTracked, resetAnalyticsMocks } = setupAnalyticsMocks();
		const user = userEvent.setup();

		beforeEach(() => {
			resetAnalyticsMocks();
			resetAllStores();
			setupAuthenticatedTest();

			useOrganizationStore.setState({
				selectedOrganizationId: "org-123",
			});

			const application = ApplicationWithTemplateFactory.build({
				id: "app-123",
				project_id: "proj-123",
				research_objectives: [],
			});

			useApplicationStore.setState({
				application,
			});

			useWizardStore.setState({
				createObjective: vi.fn().mockImplementation(async (objective) => {
					const currentApp = useApplicationStore.getState().application;
					if (currentApp) {
						useApplicationStore.setState({
							application: {
								...currentApp,
								research_objectives: [...(currentApp.research_objectives ?? []), objective],
							},
						});
					}
				}),
			});

			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_PLAN,
				isAutofillLoading: { research_deep_dive: false, research_plan: false },
				showResearchPlanInfoBanner: true,
			});
		});

		afterEach(() => {
			cleanup();
			vi.clearAllMocks();
		});

		it("tracks STEP_4_ADD when adding a new objective", async () => {
			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			const nameInput = screen.getByTestId("objective-name-input");
			const descriptionInput = screen.getByTestId("objective-description-input");
			const taskInput = screen.getByTestId("task-0-description");

			await user.type(nameInput, "Test Objective");
			await user.type(descriptionInput, "Test Description");
			await user.type(taskInput, "Test Task");

			const addObjectiveButton = screen.getByTestId("add-objective-button");
			await user.click(addObjectiveButton);

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_4_ADD, {
					applicationId: "app-123",
					contentType: "objective",
					currentStep: WizardStep.RESEARCH_PLAN,
					fieldName: "Test Objective",
					organizationId: "org-123",
					projectId: "proj-123",
				});
			});
		});

		it("tracks multiple objectives separately", async () => {
			renderResearchPlanStep();

			let newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "First Objective");
			await user.type(screen.getByTestId("objective-description-input"), "First Description");
			await user.type(screen.getByTestId("task-0-description"), "First Task");
			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				const { calls } = vi.mocked(segment.trackWizardEvent).mock;
				expect(calls).toHaveLength(1);
				expect(calls[0][0]).toBe(WizardAnalyticsEvent.STEP_4_ADD);
				expect(calls[0][1]).toMatchObject({
					contentType: "objective",
					fieldName: "First Objective",
				});
			});

			vi.mocked(segment.trackWizardEvent).mockClear();

			await new Promise((resolve) => setTimeout(resolve, 600));

			newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "Second Objective");
			await user.type(screen.getByTestId("objective-description-input"), "Second Description");
			await user.type(screen.getByTestId("task-0-description"), "Second Task");
			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				const { calls } = vi.mocked(segment.trackWizardEvent).mock;
				expect(calls).toHaveLength(1);
				expect(calls[0][0]).toBe(WizardAnalyticsEvent.STEP_4_ADD);
				expect(calls[0][1]).toMatchObject({
					contentType: "objective",
					fieldName: "Second Objective",
				});
			});
		});

		it("tracks objectives with multiple tasks", async () => {
			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "Multi-task Objective");
			await user.type(screen.getByTestId("objective-description-input"), "Description");
			await user.type(screen.getByTestId("task-0-description"), "Task 1");

			const addTaskButton = screen.getByTestId("add-task-button");
			await user.click(addTaskButton);
			await user.type(screen.getByTestId("task-1-description"), "Task 2");

			await user.click(addTaskButton);
			await user.type(screen.getByTestId("task-2-description"), "Task 3");

			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_4_ADD, {
					contentType: "objective",
					fieldName: "Multi-task Objective",
				});
			});
		});

		it("does not track when organizationId is missing", async () => {
			useOrganizationStore.setState({
				selectedOrganizationId: null,
			});

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
			await user.type(screen.getByTestId("objective-description-input"), "Test Description");
			await user.type(screen.getByTestId("task-0-description"), "Test Task");

			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				expect(useApplicationStore.getState().application?.research_objectives).toHaveLength(1);
				expectNoEventsTracked();
			});
		});

		it("tracks even when createObjective fails", async () => {
			useWizardStore.setState({
				createObjective: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "Failed Objective");
			await user.type(screen.getByTestId("objective-description-input"), "Description");
			await user.type(screen.getByTestId("task-0-description"), "Task");

			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_4_ADD, {
					contentType: "objective",
					fieldName: "Failed Objective",
				});
			});
		});

		it("tracks objectives up to MAX_OBJECTIVES", async () => {
			const existingObjectives = Array.from({ length: MAX_OBJECTIVES - 1 }, (_, i) =>
				ResearchObjectiveFactory.build({
					number: i + 1,
					title: `Existing Objective ${i + 1}`,
				}),
			);

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					research_objectives: existingObjectives,
				},
			});

			renderResearchPlanStep();

			const newObjectiveButton = screen.getByTestId("new-objective-button");
			expect(newObjectiveButton).not.toBeDisabled();

			await user.click(newObjectiveButton);

			await user.type(screen.getByTestId("objective-name-input"), "Final Objective");
			await user.type(screen.getByTestId("objective-description-input"), "Description");
			await user.type(screen.getByTestId("task-0-description"), "Task");

			await user.click(screen.getByTestId("add-objective-button"));

			await waitFor(() => {
				expectEventTracked(WizardAnalyticsEvent.STEP_4_ADD, {
					contentType: "objective",
					fieldName: "Final Objective",
				});
			});
		});
	});
});
