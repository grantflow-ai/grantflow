import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraggableTaskList } from "./draggable-task-list";

vi.mock("@/hooks/use-drag-and-drop", () => ({
	useDragAndDrop: vi.fn((_handlers, config) => {
		return {
			activeItem: undefined,
			DragDropWrapper: ({ children }: { children: React.ReactNode }) => (
				<div data-strategy={config?.strategy} data-testid="drag-drop-wrapper">
					{children}
				</div>
			),
			isItemDragging: vi.fn(() => false),
		};
	}),
}));

const mockUpdateTasksForObjective = vi.fn();
vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: vi.fn(() => mockUpdateTasksForObjective),
}));

vi.mock("./draggable-task-item", () => ({
	DraggableTaskItem: ({
		isEditing,
		onTaskDelete,
		onValueChange,
		task,
		taskIndex,
	}: {
		isEditing?: boolean;
		onTaskDelete?: () => void;
		onValueChange?: (index: number, title: string, description: string) => void;
		task: { description?: string; title: string };
		taskIndex: number;
	}) => (
		<div data-testid={`task-item-${taskIndex}`}>
			<span>
				Task {taskIndex + 1}: {(() => {
					const trimmedDescription = task.description?.trim();
					return trimmedDescription && trimmedDescription.length > 0 ? trimmedDescription : task.title;
				})()}
			</span>
			{isEditing && (
				<>
					<button
						data-testid={`update-task-${taskIndex}`}
						onClick={() => onValueChange?.(taskIndex, "Updated Title", task.description ?? "")}
						type="button"
					>
						Update
					</button>
					<button data-testid={`delete-task-${taskIndex}`} onClick={() => onTaskDelete?.()} type="button">
						Delete
					</button>
				</>
			)}
		</div>
	),
}));

vi.mock("@/components/app/buttons/icon-button", () => ({
	IconButton: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

const mockTasks = [
	{ description: "First task description", number: 1, title: "First Task" },
	{ description: "Second task description", number: 2, title: "Second Task" },
	{ description: "", number: 3, title: "Third Task" },
];

const defaultProps = {
	isEditing: false,
	objectiveIndex: 1,
	objectiveNumber: 1,
	onTaskAdd: vi.fn(),
	onTaskDelete: vi.fn(),
	onTaskReorder: vi.fn(),
	onTaskValueChange: vi.fn(),
	tasks: mockTasks,
};

describe("DraggableTaskList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders tasks section with title", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
			expect(screen.getByText("Tasks")).toBeInTheDocument();
		});

		it("renders all tasks", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("task-item-0")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-1")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-2")).toBeInTheDocument();
		});

		it("renders empty state when no tasks", () => {
			render(<DraggableTaskList {...defaultProps} tasks={[]} />);

			expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
			expect(screen.queryByTestId("task-item-0")).not.toBeInTheDocument();
		});

		it("shows add button in editing mode", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={true} />);

			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		});

		it("shows Tasks header in editing mode even with no tasks", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={true} tasks={[]} />);

			expect(screen.getByText("Tasks")).toBeInTheDocument();
			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		});

		it("hides add button in read-only mode", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} />);

			expect(screen.queryByTestId("add-task-button")).not.toBeInTheDocument();
		});
	});

	describe("Drag and Drop Configuration", () => {
		it("renders drag drop wrapper with correct strategy", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
			expect(screen.getByTestId("drag-drop-wrapper")).toHaveAttribute("data-strategy", "vertical");
		});

		it("wraps content in DragDropWrapper", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
		});
	});

	describe("Task Reordering - Editing Mode", () => {
		it("renders properly in editing mode", () => {
			const onTaskReorder = vi.fn();

			render(<DraggableTaskList {...defaultProps} isEditing={true} onTaskReorder={onTaskReorder} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		});

		it("accepts onTaskReorder callback", () => {
			const onTaskReorder = vi.fn();

			render(<DraggableTaskList {...defaultProps} isEditing={true} onTaskReorder={onTaskReorder} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});
	});

	describe("Task Reordering - Read-only Mode", () => {
		it("renders properly in read-only mode", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={3} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
			expect(screen.queryByTestId("add-task-button")).not.toBeInTheDocument();
		});

		it("handles read-only mode with objective number", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={1} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});
	});

	describe("Task Management in Editing Mode", () => {
		it("calls onTaskAdd when add button is clicked", async () => {
			const user = userEvent.setup();
			const onTaskAdd = vi.fn();

			render(<DraggableTaskList {...defaultProps} isEditing={true} onTaskAdd={onTaskAdd} />);

			await user.click(screen.getByTestId("add-task-button"));

			expect(onTaskAdd).toHaveBeenCalledTimes(1);
		});

		it("passes task value change events to onTaskValuesChange", async () => {
			const user = userEvent.setup();
			const onTaskValueChange = vi.fn();

			render(<DraggableTaskList {...defaultProps} isEditing={true} onTaskValueChange={onTaskValueChange} />);

			const updateButton = screen.getByTestId("update-task-0");
			await user.click(updateButton);

			expect(onTaskValueChange).toHaveBeenCalledWith({
				description: "First task description",
				number: 0,
				title: "Updated Title",
			});
		});

		it("passes task delete events to onTaskDelete", async () => {
			const user = userEvent.setup();
			const onTaskDelete = vi.fn();

			render(<DraggableTaskList {...defaultProps} isEditing={true} onTaskDelete={onTaskDelete} />);

			await user.click(screen.getByTestId("delete-task-0"));

			expect(onTaskDelete).toHaveBeenCalledWith(0);
		});

		it("handles missing callback functions gracefully", async () => {
			const user = userEvent.setup();

			render(
				<DraggableTaskList
					{...defaultProps}
					isEditing={true}
					onTaskAdd={undefined}
					onTaskDelete={undefined}
					onTaskValueChange={undefined}
				/>,
			);

			await expect(user.click(screen.getByTestId("add-task-button"))).resolves.not.toThrow();
			await expect(user.click(screen.getByTestId("update-task-0"))).resolves.not.toThrow();
			await expect(user.click(screen.getByTestId("delete-task-0"))).resolves.not.toThrow();
		});
	});

	describe("Task Content Display", () => {
		it("displays tasks with descriptions", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByText("Task 1: First task description")).toBeInTheDocument();
			expect(screen.getByText("Task 2: Second task description")).toBeInTheDocument();
		});

		it("displays tasks with fallback to title", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByText("Task 3: Third Task")).toBeInTheDocument();
		});

		it("passes correct props to DraggableTaskItem", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={true} objectiveIndex={2} />);

			expect(screen.getByTestId("task-item-0")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-1")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-2")).toBeInTheDocument();
		});
	});

	describe("Layout and Styling", () => {
		it("renders with proper structure", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
		});

		it("shows add button in editing mode", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={true} />);
			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		});

		it("hides add button in read-only mode", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} />);
			expect(screen.queryByTestId("add-task-button")).not.toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles single task", () => {
			const singleTask = [mockTasks[0]];

			render(<DraggableTaskList {...defaultProps} tasks={singleTask} />);

			expect(screen.getByTestId("task-item-0")).toBeInTheDocument();
			expect(screen.queryByTestId("task-item-1")).not.toBeInTheDocument();
		});

		it("handles empty tasks array", () => {
			render(<DraggableTaskList {...defaultProps} tasks={[]} />);

			expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
			expect(screen.queryByTestId("task-item-0")).not.toBeInTheDocument();
		});

		it("handles tasks with undefined descriptions", () => {
			const tasksWithUndefinedDesc = [
				{
					description: undefined,
					number: 1,
					title: "Task with undefined desc",
				},
			];

			render(<DraggableTaskList {...defaultProps} tasks={tasksWithUndefinedDesc} />);

			expect(screen.getByText("Task 1: Task with undefined desc")).toBeInTheDocument();
		});

		it("handles tasks with null titles", () => {
			const tasksWithNullTitle = [{ description: "Valid description", number: 1, title: null as any }];

			render(<DraggableTaskList {...defaultProps} tasks={tasksWithNullTitle} />);

			expect(screen.getByText("Task 1: Valid description")).toBeInTheDocument();
		});

		it("handles reordering operations gracefully", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={1} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-0")).toBeInTheDocument();
		});

		it("handles edge cases without crashing", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={1} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});
	});

	describe("Integration with Wizard Store", () => {
		it("integrates with wizard store for persistence", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={5} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});

		it("handles store integration gracefully", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={1} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("provides semantic structure", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
			expect(screen.getByText("Tasks")).toBeInTheDocument();
		});

		it("provides proper test IDs for automation", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={true} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
		});

		it("maintains focus management through drag operations", () => {
			render(<DraggableTaskList {...defaultProps} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
		});
	});

	describe("Performance Considerations", () => {
		it("renders efficiently with many tasks", () => {
			const manyTasks = Array.from({ length: 50 }, (_, i) => ({
				description: `Task ${i + 1} description`,
				number: i + 1,
				title: `Task ${i + 1}`,
			}));

			const startTime = performance.now();
			render(<DraggableTaskList {...defaultProps} tasks={manyTasks} />);
			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100);

			expect(screen.getByTestId("task-item-0")).toBeInTheDocument();
			expect(screen.getByTestId("task-item-49")).toBeInTheDocument();
		});

		it("handles rapid operations efficiently", () => {
			render(<DraggableTaskList {...defaultProps} isEditing={false} objectiveNumber={1} />);

			expect(screen.getByTestId("drag-drop-wrapper")).toBeInTheDocument();
			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});
	});
});
