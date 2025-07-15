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

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		expect(screen.getByRole("menuitem", { name: /edit task/i })).toBeInTheDocument();
	});

	it("enters editing mode when Edit Task is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getByText("Edit Objective")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
	});

	it("shows Cancel Editing option when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);
		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));
		await user.click(dropdownTrigger);

		expect(screen.getByRole("menuitem", { name: /cancel editing/i })).toBeInTheDocument();
	});

	it("exits editing mode when Cancel Editing is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		expect(dropdownTrigger).toBeTruthy();

		await user.click(dropdownTrigger);
		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));
		await user.click(dropdownTrigger);
		await user.click(screen.getByRole("menuitem", { name: /cancel editing/i }));

		expect(screen.queryByText("Edit Objective")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
	});

	it("displays editable form fields when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getByLabelText("Objective name")).toBeInTheDocument();
		expect(screen.getByLabelText("Objective description")).toBeInTheDocument();
		expect(screen.getByLabelText("Task description")).toBeInTheDocument();
	});

	it("pre-fills form fields with existing data", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getByDisplayValue("Test objective title")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test objective description")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test task description")).toBeInTheDocument();
	});

	it("allows editing objective title", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated objective title");

		expect(screen.getByDisplayValue("Updated objective title")).toBeInTheDocument();
	});

	it("allows editing objective description", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const descriptionInput = screen.getByLabelText("Objective description");
		await user.clear(descriptionInput);
		await user.type(descriptionInput, "Updated objective description");

		expect(screen.getByDisplayValue("Updated objective description")).toBeInTheDocument();
	});

	it("allows editing task description", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const taskInput = screen.getByLabelText("Task description");
		await user.clear(taskInput);
		await user.type(taskInput, "Updated task description");

		expect(screen.getByDisplayValue("Updated task description")).toBeInTheDocument();
	});

	it("shows add task button when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const addButton = screen.getByRole("button", { name: "" });
		const plusIcon = addButton.querySelector('svg[data-lucide="plus"]');
		expect(plusIcon).toBeInTheDocument();
	});

	it("adds new task when add button is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getAllByLabelText("Task description")).toHaveLength(1);

		const addButton = screen.getByRole("button", { name: "" });
		await user.click(addButton);

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);
	});

	it("shows delete button for tasks when in editing mode", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		expect(deleteButton).toBeInTheDocument();
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

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);

		const [deleteButton] = screen.getAllByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(screen.getAllByLabelText("Task description")).toHaveLength(1);
		});
	});

	it("exits editing mode when Save Changes is clicked", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		expect(dropdownTrigger).toBeTruthy();

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const saveButton = screen.getByRole("button", { name: /save changes/i });
		await user.click(saveButton);

		expect(screen.queryByText("Edit Objective")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
	});

	it("displays updated content after saving changes", async () => {
		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated title");

		const saveButton = screen.getByRole("button", { name: /save changes/i });
		await user.click(saveButton);

		expect(screen.getByText("Updated title")).toBeInTheDocument();
	});

	// eslint-disable-next-line sonarjs/assertions-in-tests
	it("does not show editing controls when not in editing mode", () => {
		render(<ResearchPlanPreview />);

		expect(screen.queryByText("Edit Objective")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Objective name")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
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

		const menuButtons = screen.getAllByRole("button", { name: /drag to reorder objective/i });
		expect(menuButtons).toHaveLength(2);

		const firstDropdownTrigger = menuButtons[0].parentElement?.querySelector('button[type="button"]');

		if (firstDropdownTrigger) {
			await user.click(firstDropdownTrigger);
		}

		await user.click(screen.getByRole("menuitem", { name: /edit task/i }));

		expect(screen.getByText("Edit Objective")).toBeInTheDocument();
		expect(screen.getByText("Second objective")).toBeInTheDocument();
	});
});

describe("ResearchPlanPreview Display Mode", () => {
	const user = userEvent.setup();
	const mockHandleObjectiveDragEnd = vi.fn();
	const mockRemoveObjective = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

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

		expect(screen.getByText("Tasks")).toBeInTheDocument();
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

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		expect(screen.getByRole("menuitem", { name: /remove/i })).toBeInTheDocument();
	});

	it("calls removeObjective when remove is clicked", async () => {
		mockApplicationStore(mockObjectives);

		render(<ResearchPlanPreview />);

		const dropdownTrigger = screen.getByRole("button", { name: /menu/i });

		await user.click(dropdownTrigger);

		await user.click(screen.getByRole("menuitem", { name: /remove/i }));

		expect(mockRemoveObjective).toHaveBeenCalledWith(1);
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
				research_tasks: [{ description: "", number: 1, title: "Fallback task title" }],
				title: "Test objective title",
			},
		];

		mockApplicationStore(objectiveWithTitleFallback);

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Task: Fallback task title")).toBeInTheDocument();
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

		expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

		const plusIcon = screen.queryByRole("button", { name: "" })?.querySelector('svg[data-lucide="plus"]');
		expect(plusIcon).not.toBeInTheDocument();
	});
});
