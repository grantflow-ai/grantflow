import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditableObjective, ObjectiveCardContent, ObjectiveHeader } from "./objective-components";

vi.mock("@/components/app/buttons/app-button", () => ({
	AppButton: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/app/buttons/icon-button", () => ({
	IconButton: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/app/forms/textarea-field", () => ({
	default: ({ label, onChange, placeholder, value, ...props }: any) => (
		<div>
			<label htmlFor={props.id}>{label}</label>
			<textarea id={props.id} onChange={onChange} placeholder={placeholder} value={value} {...props} />
		</div>
	),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuItem: ({ children, onClick }: any) => (
		<button data-testid="dropdown-item" onClick={onClick} type="button">
			{children}
		</button>
	),
	DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

describe.sequential("ObjectiveComponents", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("EditableObjective", () => {
		function renderEditableObjective(overrides = {}) {
			const defaultProps = {
				index: 1,
				objective: ResearchObjectiveFactory.build({
					description: "Test Description",
					research_tasks: [
						{ description: "Task 1", number: 1, title: "" },
						{ description: "Task 2", number: 2, title: "" },
					],
					title: "Test Objective",
				}),
				onCancel: vi.fn(),
				onSave: vi.fn(),
				...overrides,
			};

			return {
				...render(<EditableObjective {...defaultProps} />),
				props: defaultProps,
			};
		}

		it("renders edit objective title", () => {
			renderEditableObjective();

			expect(screen.getByTestId("edit-objective-title")).toHaveTextContent("Edit Objective");
		});

		it("renders save changes button", () => {
			renderEditableObjective();

			expect(screen.getByTestId("save-changes-button")).toBeInTheDocument();
		});

		it("initializes form fields with objective data", () => {
			const objective = ResearchObjectiveFactory.build({
				description: "Custom Description",
				title: "Custom Title",
			});

			renderEditableObjective({ objective });

			const titleField = screen.getByDisplayValue("Custom Title");
			const descriptionField = screen.getByDisplayValue("Custom Description");

			expect(titleField).toBeInTheDocument();
			expect(descriptionField).toBeInTheDocument();
		});

		it("renders form fields with labels", () => {
			renderEditableObjective();

			expect(screen.getByLabelText("Objective name")).toBeInTheDocument();
			expect(screen.getByLabelText("Objective description")).toBeInTheDocument();
		});

		it("updates title when input changes", async () => {
			const user = userEvent.setup();
			renderEditableObjective();

			const titleField = screen.getByDisplayValue("Test Objective");
			await user.clear(titleField);
			await user.type(titleField, "Updated Title");

			expect(titleField).toHaveValue("Updated Title");
		});

		it("updates description when input changes", async () => {
			const user = userEvent.setup();
			renderEditableObjective();

			const descriptionField = screen.getByDisplayValue("Test Description");
			await user.clear(descriptionField);
			await user.type(descriptionField, "Updated Description");

			expect(descriptionField).toHaveValue("Updated Description");
		});

		it("calls onSave with updated objective data", async () => {
			const user = userEvent.setup();
			const { props } = renderEditableObjective();

			const titleField = screen.getByDisplayValue("Test Objective");
			const saveButton = screen.getByTestId("save-changes-button");

			await user.clear(titleField);
			await user.type(titleField, "New Title");
			await user.click(saveButton);

			expect(props.onSave).toHaveBeenCalledWith({
				...props.objective,
				title: "New Title",
			});
		});

		it("renders tasks section with add button", () => {
			renderEditableObjective();

			expect(screen.getByTestId("tasks-section")).toHaveTextContent("Tasks");
			expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		});

		it("adds new task when add button is clicked", async () => {
			const user = userEvent.setup();
			renderEditableObjective();

			const initialTasks = screen.getAllByText(/Task description/);
			const addButton = screen.getByTestId("add-task-button");

			await user.click(addButton);

			const updatedTasks = screen.getAllByText(/Task description/);
			expect(updatedTasks).toHaveLength(initialTasks.length + 1);
		});

		it("updates task description when changed", async () => {
			const user = userEvent.setup();
			renderEditableObjective();

			const taskFields = screen.getAllByDisplayValue(/Task \d/);
			await user.clear(taskFields[0]);
			await user.type(taskFields[0], "Updated Task");

			expect(taskFields[0]).toHaveValue("Updated Task");
		});

		it("removes task when delete button is clicked", async () => {
			const user = userEvent.setup();
			renderEditableObjective();

			const deleteButtons = screen.getAllByTestId("delete-task-button");
			const initialTasks = screen.getAllByText(/Task description/);

			await user.click(deleteButtons[0]);

			const updatedTasks = screen.getAllByText(/Task description/);
			expect(updatedTasks).toHaveLength(initialTasks.length - 1);
		});
	});

	describe("ObjectiveCardContent", () => {
		function renderObjectiveCardContent(overrides = {}) {
			const defaultProps = {
				index: 1,
				objective: ResearchObjectiveFactory.build({
					description: "Content Description",
					research_tasks: [
						{ description: "Content Task 1", number: 1, title: "" },
						{ description: "Content Task 2", number: 2, title: "" },
					],
					title: "Content Title",
				}),
				...overrides,
			};

			return render(<ObjectiveCardContent {...defaultProps} />);
		}

		it("displays objective content", () => {
			renderObjectiveCardContent();

			expect(screen.getByText("Content Title")).toBeInTheDocument();
			expect(screen.getByText("Content Description")).toBeInTheDocument();
		});

		it("renders tasks section", () => {
			renderObjectiveCardContent();

			expect(screen.getByTestId("tasks-section")).toHaveTextContent("Tasks");
		});

		it("displays task descriptions", () => {
			renderObjectiveCardContent();

			expect(screen.getByText("Task: Content Task 1")).toBeInTheDocument();
			expect(screen.getByText("Task: Content Task 2")).toBeInTheDocument();
		});

		it("handles empty task descriptions", () => {
			const objective = ResearchObjectiveFactory.build({
				research_tasks: [{ description: "", number: 1, title: "Fallback Title" }],
			});

			renderObjectiveCardContent({ objective });

			expect(screen.getByText("Task: Fallback Title")).toBeInTheDocument();
		});
	});

	describe("ObjectiveHeader", () => {
		function renderObjectiveHeader(overrides = {}) {
			const defaultProps = {
				attributes: { "data-testid": "drag-attributes" },
				index: 1,
				isEditing: false,
				listeners: { "data-testid": "drag-listeners" },
				objective: ResearchObjectiveFactory.build({ title: "Header Objective" }),
				objectivesCount: 3,
				onCancel: vi.fn(),
				onEdit: vi.fn(),
				onRemove: vi.fn(),
				...overrides,
			};

			return {
				...render(<ObjectiveHeader {...defaultProps} />),
				props: defaultProps,
			};
		}

		it("displays objective index", () => {
			renderObjectiveHeader({ index: 5 });

			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("renders drag handle when multiple objectives", () => {
			renderObjectiveHeader({ objectivesCount: 3 });

			const dragButton = screen.getByLabelText(/Drag to reorder objective/);
			expect(dragButton).toBeInTheDocument();
		});

		it("disables drag handle for single objective", () => {
			renderObjectiveHeader({ objectivesCount: 1 });

			expect(screen.queryByLabelText(/Drag to reorder objective/)).not.toBeInTheDocument();
		});

		it("renders dropdown menu trigger", () => {
			renderObjectiveHeader();

			expect(screen.getByTestId("menu-trigger")).toBeInTheDocument();
		});

		it("shows edit menu item when not editing", () => {
			renderObjectiveHeader({ isEditing: false });

			expect(screen.getByTestId("edit-task-menuitem")).toHaveTextContent("Edit Objective");
		});

		it("shows cancel menu item when editing", () => {
			renderObjectiveHeader({ isEditing: true });

			expect(screen.getByTestId("edit-task-menuitem")).toHaveTextContent("Cancel Editing");
		});

		it("calls onEdit when edit menu item is clicked", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveHeader({ isEditing: false });

			const editMenuItem = screen.getByTestId("edit-task-menuitem");
			await user.click(editMenuItem);

			expect(props.onEdit).toHaveBeenCalledOnce();
		});

		it("calls onCancel when cancel menu item is clicked", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveHeader({ isEditing: true });

			const cancelMenuItem = screen.getByTestId("edit-task-menuitem");
			await user.click(cancelMenuItem);

			expect(props.onCancel).toHaveBeenCalledOnce();
		});

		it("calls onRemove when remove menu item is clicked", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveHeader();

			const removeMenuItem = screen.getByTestId("remove-menuitem");
			await user.click(removeMenuItem);

			expect(props.onRemove).toHaveBeenCalledOnce();
		});

		it("renders remove menu item", () => {
			renderObjectiveHeader();

			expect(screen.getByTestId("remove-menuitem")).toHaveTextContent("Remove");
		});

		it("handles high index numbers", () => {
			renderObjectiveHeader({ index: 999 });

			expect(screen.getByText("999")).toBeInTheDocument();
		});

		it("handles zero objectives count", () => {
			renderObjectiveHeader({ objectivesCount: 0 });

			expect(screen.queryByLabelText(/Drag to reorder objective/)).not.toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles objectives with empty titles", () => {
			const objective = ResearchObjectiveFactory.build({ title: "" });
			render(<ObjectiveCardContent index={1} objective={objective} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});

		it("handles objectives with no tasks", () => {
			const objective = ResearchObjectiveFactory.build({ research_tasks: [] });
			render(<ObjectiveCardContent index={1} objective={objective} />);

			expect(screen.getByTestId("tasks-section")).toBeInTheDocument();
		});

		it("handles tasks with null descriptions", () => {
			const objective = ResearchObjectiveFactory.build({
				research_tasks: [{ description: null as any, number: 1, title: "Null Task Title" }],
			});

			render(<ObjectiveCardContent index={1} objective={objective} />);

			expect(screen.getByText("Task: Null Task Title")).toBeInTheDocument();
		});

		it("handles undefined task descriptions", () => {
			const objective = ResearchObjectiveFactory.build({
				research_tasks: [{ description: undefined as any, number: 1, title: "Undefined Task Title" }],
			});

			render(<ObjectiveCardContent index={1} objective={objective} />);

			expect(screen.getByText("Task: Undefined Task Title")).toBeInTheDocument();
		});
	});
});
