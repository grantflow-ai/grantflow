import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ResearchPlanPreview } from "./research-plan-preview";

vi.mock("@/stores/application-store");
vi.mock("@/stores/wizard-store");
vi.mock("@/utils/logger");

const mockUseApplicationStore = vi.mocked(useApplicationStore);
const mockUseWizardStore = vi.mocked(useWizardStore);

const mockApplicationStore = (objectives: any[]) => {
	mockUseApplicationStore.mockImplementation((selector: any) => {
		if (typeof selector === "function") {
			return selector({
				application: {
					research_objectives: objectives,
				},
			});
		}
		return {
			application: {
				research_objectives: objectives,
			},
		};
	});
};

const mockObjectives = [
	{
		description: "Test objective description",
		number: 1,
		research_tasks: [
			{
				description: "Test task description",
				number: 1,
				title: "Test task title",
			},
		],
		title: "Test objective title",
	},
];

describe("ResearchPlanPreview Editing Mode", () => {
	const user = userEvent.setup();
	const mockHandleObjectiveDragEnd = vi.fn();
	const mockRemoveObjective = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockApplicationStore(mockObjectives);

		mockUseWizardStore.mockReturnValue((state: any) => {
			if (typeof state === "function") {
				return state({
					handleObjectiveDragEnd: mockHandleObjectiveDragEnd,
					removeObjective: mockRemoveObjective,
				});
			}
			return {
				handleObjectiveDragEnd: mockHandleObjectiveDragEnd,
				removeObjective: mockRemoveObjective,
			};
		});
	});

	it("shows Edit Task option in dropdown menu initially", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		expect(screen.getByTestId("edit-task-menuitem")).toBeInTheDocument();
	});

	it("enters editing mode when Edit Task is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByTestId("edit-objective-title")).toBeInTheDocument();
		expect(screen.getByTestId("save-changes-button")).toBeInTheDocument();
	});

	it("shows Cancel Editing option when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("edit-task-menuitem"));
		await user.click(dropdownTrigger);

		expect(screen.getByTestId("edit-task-menuitem")).toBeInTheDocument();
	});

	it("exits editing mode when Cancel Editing is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		expect(dropdownTrigger).toBeTruthy();

		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("edit-task-menuitem"));
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.queryByTestId("edit-objective-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("save-changes-button")).not.toBeInTheDocument();
	});

	it("displays editable form fields when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByLabelText("Objective name")).toBeInTheDocument();
		expect(screen.getByLabelText("Objective description")).toBeInTheDocument();
		expect(screen.getByLabelText("Task description")).toBeInTheDocument();
	});

	it("pre-fills form fields with existing data", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByDisplayValue("Test objective title")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test objective description")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test task description")).toBeInTheDocument();
	});

	it("allows editing objective title", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated objective title");

		expect(screen.getByDisplayValue("Updated objective title")).toBeInTheDocument();
	});

	it("allows editing objective description", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		const descriptionInput = screen.getByLabelText("Objective description");
		await user.clear(descriptionInput);
		await user.type(descriptionInput, "Updated objective description");

		expect(screen.getByDisplayValue("Updated objective description")).toBeInTheDocument();
	});

	it("allows editing task description", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		const taskInput = screen.getByLabelText("Task description");
		await user.clear(taskInput);
		await user.type(taskInput, "Updated task description");

		expect(screen.getByDisplayValue("Updated task description")).toBeInTheDocument();
	});

	it("shows add task button when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
	});

	it("adds new task when add button is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getAllByLabelText("Task description")).toHaveLength(1);

		await user.click(screen.getByTestId("add-task-button"));

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);
	});

	it("shows delete button for tasks when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByTestId("delete-task-button")).toBeInTheDocument();
	});

	it("removes task when delete button is clicked", async () => {
		const multipleTasksObjective = [
			{
				...mockObjectives[0],
				research_tasks: [
					{ description: "Task 1", number: 1, title: "Task 1" },
					{ description: "Task 2", number: 2, title: "Task 2" },
				],
			},
		];

		mockApplicationStore(multipleTasksObjective);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);

		const deleteButtons = screen.getAllByTestId("delete-task-button");
		await user.click(deleteButtons[0]);

		await waitFor(() => {
			expect(screen.getAllByLabelText("Task description")).toHaveLength(1);
		});
	});

	it("exits editing mode when Save Changes is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		expect(dropdownTrigger).toBeTruthy();

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		const saveButton = screen.getByTestId("save-changes-button");
		await user.click(saveButton);

		expect(screen.queryByTestId("edit-objective-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("save-changes-button")).not.toBeInTheDocument();
	});

	it("displays updated content after saving changes", async () => {
		const mockLog = vi.spyOn(console, "info").mockImplementation(() => {});

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated title");

		const saveButton = screen.getByTestId("save-changes-button");
		await user.click(saveButton);

		expect(screen.queryByTestId("edit-objective-title")).not.toBeInTheDocument();
		expect(screen.getByText("Test objective title")).toBeInTheDocument();

		mockLog.mockRestore();
	});

	// eslint-disable-next-line sonarjs/assertions-in-tests
	it("does not show editing controls when not in editing mode", () => {
		render(<ResearchPlanPreview />);

		expect(screen.queryByTestId("edit-objective-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("save-changes-button")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Objective name")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument();
	});

	it("shows static content when not in editing mode", () => {
		render(<ResearchPlanPreview />);

		expect(screen.getByText("Test objective title")).toBeInTheDocument();
		expect(screen.getByText("Test objective description")).toBeInTheDocument();
		expect(screen.getByText("Task: Test task description")).toBeInTheDocument();
	});

	it("handles multiple objectives independently", async () => {
		const multipleObjectives = [
			mockObjectives[0],
			{
				...mockObjectives[0],
				number: 2,
				title: "Second objective",
			},
		];

		mockApplicationStore(multipleObjectives);

		render(<ResearchPlanPreview />);

		const allButtons = screen.getAllByTestId("menu-trigger");

		expect(allButtons).toHaveLength(2);

		await user.click(allButtons[0]);

		await user.click(screen.getByTestId("edit-task-menuitem"));

		expect(screen.getByTestId("edit-objective-title")).toBeInTheDocument();
		expect(screen.getByText("Second objective")).toBeInTheDocument();
	});
});

describe("ResearchPlanPreview Display Mode", () => {
	const user = userEvent.setup();
	const mockHandleObjectiveDragEnd = vi.fn();
	const mockRemoveObjective = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseWizardStore.mockImplementation((selector: any) => {
			if (typeof selector === "function") {
				return selector({
					handleObjectiveDragEnd: mockHandleObjectiveDragEnd,
					removeObjective: mockRemoveObjective,
				});
			}
			return {
				handleObjectiveDragEnd: mockHandleObjectiveDragEnd,
				removeObjective: mockRemoveObjective,
			};
		});
	});

	it("shows empty state when no objectives exist", () => {
		mockApplicationStore([]);

		render(<ResearchPlanPreview />);

		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});

	it("displays objective cards in grid layout", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Test objective title")).toBeInTheDocument();
		expect(screen.getByText("Test objective description")).toBeInTheDocument();
	});

	it("displays task information within objectives", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		expect(screen.getByText("Task: Test task description")).toBeInTheDocument();
	});

	it("shows objective index badges", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("shows task index badges", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("1.1")).toBeInTheDocument();
	});

	it("displays drag handles for objectives", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByRole("button", { name: /drag to reorder objective/i })).toBeInTheDocument();
	});

	it("shows remove option in dropdown menu", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		expect(screen.getByTestId("remove-menuitem")).toBeInTheDocument();
	});

	it("calls removeObjective when remove is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");

		await user.click(dropdownTrigger);

		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();
		expect(screen.getByTestId("delete-dialog-description")).toBeInTheDocument();

		await user.click(screen.getByTestId("confirm-delete-button"));

		expect(mockRemoveObjective).toHaveBeenCalledWith(1);
	});

	it("shows delete confirmation dialog when remove option is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		const dropdownTrigger = screen.getByTestId("menu-trigger");
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();
		expect(screen.getByTestId("delete-dialog-description")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-delete-button")).toBeInTheDocument();
		expect(screen.getByTestId("confirm-delete-button")).toBeInTheDocument();
	});

	it("displays correct dialog content for delete confirmation", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toHaveTextContent(
			"Are you sure you want to delete this objective?",
		);

		expect(screen.getByTestId("delete-dialog-description")).toHaveTextContent(
			"All content within this objective and all its associated tasks. will be permanently removed. This action cannot be undone.",
		);

		expect(screen.getByTestId("cancel-delete-button")).toHaveTextContent("Cancel");
		expect(screen.getByTestId("confirm-delete-button")).toHaveTextContent("Delete Objective");
	});

	it("closes dialog when cancel button is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		await user.click(screen.getByTestId("cancel-delete-button"));

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).not.toHaveBeenCalled();
	});

	it("closes dialog when close button (X) is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const closeButton = screen.getByRole("button", { name: /close/i });
		await user.click(closeButton);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).not.toHaveBeenCalled();
	});

	it("calls removeObjective and closes dialog when confirm button is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByTestId("menu-trigger");
		await user.click(dropdownTrigger);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		await user.click(screen.getByTestId("confirm-delete-button"));

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).toHaveBeenCalledWith(1);
	});

	it("handles multiple objectives delete dialogs independently", async () => {
		const multipleObjectives = [
			{
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			},
			{
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			},
		];

		mockApplicationStore(multipleObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTriggers = screen.getAllByTestId("menu-trigger");
		expect(dropdownTriggers).toHaveLength(2);

		await user.click(dropdownTriggers[1]);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		await user.click(screen.getByTestId("confirm-delete-button"));

		expect(mockRemoveObjective).toHaveBeenCalledWith(2);
	});

	it("dialog state resets correctly between different objectives", async () => {
		const multipleObjectives = [
			{
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			},
			{
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			},
		];

		mockApplicationStore(multipleObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTriggers = screen.getAllByTestId("menu-trigger");

		await user.click(dropdownTriggers[0]);
		await user.click(screen.getByTestId("remove-menuitem"));

		await user.click(screen.getByTestId("cancel-delete-button"));

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();

		await user.click(dropdownTriggers[1]);
		await user.click(screen.getByTestId("remove-menuitem"));

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		await user.click(screen.getByTestId("confirm-delete-button"));

		expect(mockRemoveObjective).toHaveBeenCalledWith(2);
	});

	it("displays multiple objectives with different numbers", () => {
		const multipleObjectives = [
			{
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			},
			{
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			},
		];

		mockApplicationStore(multipleObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("First objective")).toBeInTheDocument();
		expect(screen.getByText("Second objective")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("displays multiple tasks within an objective", () => {
		const objectiveWithMultipleTasks = [
			{
				description: "Test objective description",
				number: 1,
				research_tasks: [
					{ description: "First task description", number: 1, title: "First task" },
					{ description: "Second task description", number: 2, title: "Second task" },
				],
				title: "Test objective title",
			},
		];

		mockApplicationStore(objectiveWithMultipleTasks);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Task: First task description")).toBeInTheDocument();
		expect(screen.getByText("Task: Second task description")).toBeInTheDocument();
		expect(screen.getByText("1.1")).toBeInTheDocument();
		expect(screen.getByText("1.2")).toBeInTheDocument();
	});

	it("handles objectives with fallback task titles", () => {
		const objectiveWithTitleFallback = [
			{
				description: "Test objective description",
				number: 1,
				research_tasks: [{ description: null, number: 1, title: "Fallback task title" }],
				title: "Test objective title",
			},
		];

		mockApplicationStore(objectiveWithTitleFallback);

		render(<ResearchPlanPreview />);

		expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Fallback task title");
	});

	it("displays task drag handles", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.getByRole("button", { name: /drag to reorder task/i })).toBeInTheDocument();
	});

	// eslint-disable-next-line sonarjs/assertions-in-tests
	it("does not show task management controls in display mode", () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument();
		expect(screen.queryByTestId("add-task-button")).not.toBeInTheDocument();
	});
});
