import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraggableTaskItem } from "./draggable-task-item";

vi.mock("@dnd-kit/sortable", async () => {
	const actual = await vi.importActual("@dnd-kit/sortable");
	return {
		...actual,
		useSortable: vi.fn(() => ({
			attributes: { "data-testid": "sortable-attributes" },
			isDragging: false,
			listeners: { onPointerDown: vi.fn() },
			setNodeRef: vi.fn(),
			transform: null,
			transition: undefined,
		})),
	};
});

vi.mock("@/components/app/buttons/icon-button", () => ({
	IconButton: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/app/fields/textarea-field", () => ({
	default: ({ label, onChange, placeholder, value, ...props }: any) => (
		<div>
			<label htmlFor={props.id}>{label}</label>
			<textarea id={props.id} onChange={onChange} placeholder={placeholder} value={value} {...props} />
		</div>
	),
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
	return (
		<DndContext>
			<SortableContext items={["1-task-0"]} strategy={verticalListSortingStrategy}>
				{children}
			</SortableContext>
		</DndContext>
	);
}

const mockTask = {
	description: "Test task description",
	number: 1,
	title: "Test Task Title",
};

const defaultProps = {
	isEditing: false,
	objectiveIndex: 1,
	onTaskDelete: vi.fn(),
	onValueChange: vi.fn(),
	task: mockTask,
	taskIndex: 0,
	totalTasks: 2,
};

describe("DraggableTaskItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders task item with basic structure", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} />
				</TestWrapper>,
			);

			expect(screen.getByText("1.1")).toBeInTheDocument();
			expect(screen.getByLabelText("Drag to reorder task 1")).toBeInTheDocument();
		});

		it("displays task content in read-only mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Test task description");
		});

		it("displays textarea in editing mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			expect(screen.getByLabelText("Task description")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test task description")).toBeInTheDocument();
		});
	});

	describe("Task Content Logic", () => {
		it("displays description when available", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Test task description");
		});

		it("falls back to title when description is empty", () => {
			const taskWithEmptyDescription = {
				...mockTask,
				description: "",
			};

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} task={taskWithEmptyDescription} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Test Task Title");
		});

		it("falls back to title when description is only whitespace", () => {
			const taskWithWhitespaceDescription = {
				...mockTask,
				description: "   \n\t  ",
			};

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} task={taskWithWhitespaceDescription} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Test Task Title");
		});

		it("falls back to title when description is undefined", () => {
			const taskWithUndefinedDescription = {
				...mockTask,
				description: undefined,
			};

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} task={taskWithUndefinedDescription} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Test Task Title");
		});

		it("trims whitespace from valid descriptions", () => {
			const taskWithWhitespaceAroundDescription = {
				...mockTask,
				description: "  Valid description  ",
			};

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} task={taskWithWhitespaceAroundDescription} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task: Valid description");
		});
	});

	describe("Drag Functionality", () => {
		it("shows active drag handle when multiple tasks exist", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} totalTasks={2} />
				</TestWrapper>,
			);

			const dragButton = screen.getByRole("button", { name: "Drag to reorder task 1" });
			expect(dragButton).toBeInTheDocument();
			expect(dragButton).not.toHaveClass("text-gray-300");
		});

		it("disables drag handle when only one task exists", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} totalTasks={1} />
				</TestWrapper>,
			);

			expect(screen.queryByRole("button", { name: "Drag to reorder task 1" })).not.toBeInTheDocument();
			expect(screen.getByTestId("task-display")).toBeInTheDocument();
		});

		it("configures drag operations correctly", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} objectiveIndex={2} taskIndex={3} />
				</TestWrapper>,
			);

			expect(screen.getByText("2.4")).toBeInTheDocument();
		});

		it("handles single task scenario", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} totalTasks={1} />
				</TestWrapper>,
			);

			expect(screen.queryByRole("button", { name: "Drag to reorder task 1" })).not.toBeInTheDocument();
		});
	});

	describe("Task Numbering", () => {
		it("displays correct task number format", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} objectiveIndex={3} taskIndex={2} />
				</TestWrapper>,
			);

			expect(screen.getByText("3.3")).toBeInTheDocument();
		});

		it("handles zero-based taskIndex correctly", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} objectiveIndex={1} taskIndex={0} />
				</TestWrapper>,
			);

			expect(screen.getByText("1.1")).toBeInTheDocument();
		});
	});

	describe("Editing Mode", () => {
		it("shows delete button in editing mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("delete-task-button")).toBeInTheDocument();
		});

		it("hides delete button in read-only mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={false} />
				</TestWrapper>,
			);

			expect(screen.queryByTestId("delete-task-button")).not.toBeInTheDocument();
		});

		it("calls onValueChange when textarea content changes", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn();

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} onValueChange={onValueChange} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText("Task description");
			await user.clear(textarea);
			await user.type(textarea, "x");

			expect(onValueChange).toHaveBeenCalled();
			expect(onValueChange).toHaveBeenCalledWith(0, expect.any(String));
		});

		it("calls onTaskDelete when delete button is clicked", async () => {
			const user = userEvent.setup();
			const onTaskDelete = vi.fn();

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} onTaskDelete={onTaskDelete} />
				</TestWrapper>,
			);

			await user.click(screen.getByTestId("delete-task-button"));

			expect(onTaskDelete).toHaveBeenCalled();
		});

		it("shows correct placeholder text in textarea", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			expect(screen.getByPlaceholderText("Describe a step to achieve this objective")).toBeInTheDocument();
		});

		it("sets correct textarea ID for accessibility", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} objectiveIndex={2} taskIndex={1} />
				</TestWrapper>,
			);

			expect(screen.getByLabelText("Task description")).toHaveAttribute("id", "task-description-2-1");
		});
	});

	describe("Styling States", () => {
		it("applies correct header styling in editing mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			const header = screen.getByText("1.1");
			expect(header).toHaveClass("bg-app-gray-300", "text-white");
		});

		it("applies correct header styling in read-only mode", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={false} />
				</TestWrapper>,
			);

			const header = screen.getByText("1.1");
			expect(header).toHaveClass("bg-app-gray-50", "text-primary");
		});

		it("shows disabled styling when single task", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} totalTasks={1} />
				</TestWrapper>,
			);

			expect(screen.queryByRole("button", { name: "Drag to reorder task 1" })).not.toBeInTheDocument();
			expect(screen.getByTestId("task-display")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles missing onValueChange gracefully", async () => {
			const user = userEvent.setup();

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} onValueChange={undefined} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText("Task description");

			await expect(user.type(textarea, " test")).resolves.not.toThrow();
		});

		it("handles missing onTaskDelete gracefully", async () => {
			const user = userEvent.setup();

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} onTaskDelete={undefined} />
				</TestWrapper>,
			);

			const deleteButton = screen.getByTestId("delete-task-button");

			await expect(user.click(deleteButton)).resolves.not.toThrow();
		});

		it("handles task with empty title", () => {
			const taskWithEmptyTitle = {
				...mockTask,
				description: "",
				title: "",
			};

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} task={taskWithEmptyTitle} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toHaveTextContent("Task:");
		});

		it("handles negative taskIndex (edge case)", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} taskIndex={-1} />
				</TestWrapper>,
			);

			expect(screen.getByText("1.0")).toBeInTheDocument();
		});

		it("handles large taskIndex values", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} taskIndex={99} />
				</TestWrapper>,
			);

			expect(screen.getByText("1.100")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("provides correct aria-label for drag button", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} totalTasks={2} />
				</TestWrapper>,
			);

			expect(screen.getByLabelText("Drag to reorder task 1")).toBeInTheDocument();
		});

		it("associates label with textarea correctly", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText("Task description");
			const label = screen.getByText("Task description");

			expect(label).toHaveAttribute("for", textarea.id);
		});

		it("provides proper test IDs for automation", () => {
			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={false} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("task-display")).toBeInTheDocument();

			render(
				<TestWrapper>
					<DraggableTaskItem {...defaultProps} isEditing={true} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("delete-task-button")).toBeInTheDocument();
		});
	});
});
