import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectiveForm, type ObjectiveFormData } from "./objective-form";

describe.sequential("ObjectiveForm", () => {
	afterEach(() => {
		cleanup();
	});

	const defaultProps = {
		objectiveNumber: 1,
		onSaveAction: vi.fn(),
	};

	it("renders with correct heading based on objective number", () => {
		render(<ObjectiveForm {...defaultProps} objectiveNumber={3} />);

		expect(screen.getByTestId("objective-form-heading")).toHaveTextContent("Objective 3");
	});

	it("renders all form fields", () => {
		render(<ObjectiveForm {...defaultProps} />);

		expect(screen.getByTestId("objective-title-input")).toBeInTheDocument();
		expect(screen.getByTestId("objective-description-input")).toBeInTheDocument();
		// No tasks shown initially (empty tasks array)
		expect(screen.queryByTestId("task-title-0")).not.toBeInTheDocument();
		expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
	});

	it("starts with no tasks by default", () => {
		render(<ObjectiveForm {...defaultProps} />);

		// No tasks shown initially (empty tasks array)
		expect(screen.queryByTestId("task-title-0")).not.toBeInTheDocument();
		expect(screen.queryByTestId("task-description-0")).not.toBeInTheDocument();
	});

	it("adds new task when add task button is clicked with valid objective data", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		// Fill objective data first to enable Add Task button
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Now Add Task should be enabled
		await user.click(screen.getByTestId("add-task-button"));

		// Should see the first task title field
		expect(screen.getByTestId("task-title-0")).toBeInTheDocument();
		// Description field should be visible after UI changes
		expect(screen.queryByTestId("task-description-0")).toBeInTheDocument();
	});

	it("allows adding multiple tasks", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		// Fill objective data first
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Add first task
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "First task title");
		await user.type(screen.getByTestId("task-description-0"), "First task description");

		// Add second task
		await user.click(screen.getByTestId("add-task-button"));
		expect(screen.getByTestId("task-title-1")).toBeInTheDocument();

		// Both tasks should be visible
		expect(screen.getByTestId("task-title-0")).toBeInTheDocument();
		expect(screen.getByTestId("task-title-1")).toBeInTheDocument();
	});

	it("does not show remove button (auto-cleanup handles empty tasks)", () => {
		render(<ObjectiveForm {...defaultProps} />);

		// No explicit remove buttons - empty tasks are auto-cleaned
		expect(screen.queryByTestId("remove-task-0")).not.toBeInTheDocument();
	});

	it("disables save button when no complete tasks exist", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Save button should be disabled - no complete tasks
		const saveButton = screen.getByTestId("add-objective-button");
		expect(saveButton).toBeDisabled();
		expect(onSaveAction).not.toHaveBeenCalled();
	});

	it("calls onSaveAction with correct data when form is valid", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Add task and fill both title and description
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "Test Task Title");
		await user.type(screen.getByTestId("task-description-0"), "Test Task Description");

		await user.click(screen.getByTestId("add-objective-button"));

		expect(onSaveAction).toHaveBeenCalledWith({
			description: "Test Description",
			number: 1,
			tasks: [
				expect.objectContaining({
					description: "Test Task Description",
					id: expect.any(String),
					number: 1,
					title: "Test Task Title",
				}),
			],
			title: "Test Objective",
		});
	});

	it("populates form with initial data when provided", () => {
		const initialData: ObjectiveFormData = {
			description: "Initial Description",
			number: 1,
			tasks: [
				{ description: "Initial Task 1", id: "1", number: 1, title: "Task 1" },
				{ description: "Initial Task 2", id: "2", number: 2, title: "Task 2" },
			],
			title: "Initial Objective",
		};

		render(<ObjectiveForm {...defaultProps} initialData={initialData} />);

		expect(screen.getByTestId("objective-title-input")).toHaveValue("Initial Objective");
		expect(screen.getByTestId("objective-description-input")).toHaveValue("Initial Description");
		expect(screen.getByTestId("task-title-0")).toHaveValue("Task 1");
		expect(screen.getByTestId("task-description-0")).toHaveValue("Initial Task 1");
		expect(screen.getByTestId("task-title-1")).toHaveValue("Task 2");
		expect(screen.getByTestId("task-description-1")).toHaveValue("Initial Task 2");
	});

	it("enables save button when all required fields are filled", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("add-objective-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		expect(saveButton).toBeDisabled();

		// Add a task
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "Test Task Title");
		expect(saveButton).not.toBeDisabled(); // Task description is now optional

		await user.type(screen.getByTestId("task-description-0"), "Test Task Description");
		expect(saveButton).toBeEnabled();
	});

	it("keeps save button disabled when only whitespace is entered", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("add-objective-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-title-input"), "   ");
		await user.type(screen.getByTestId("objective-description-input"), "   ");

		// Add Task button should be disabled since objective fields are whitespace
		const addTaskButton = screen.getByTestId("add-task-button");
		expect(addTaskButton).toBeDisabled();
		expect(saveButton).toBeDisabled();
	});

	it("save button is disabled when form is invalid", () => {
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("add-objective-button");
		expect(saveButton).toBeDisabled();
	});

	it("save button is enabled when all fields are filled", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("add-objective-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Add task and fill both title and description
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "Test Task Title");
		await user.type(screen.getByTestId("task-description-0"), "Test Task Description");

		expect(saveButton).toBeEnabled();
	});

	it("correctly validates form state based on field content", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("add-objective-button");

		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-title-input"), "   ");
		expect(saveButton).toBeDisabled();

		await user.clear(screen.getByTestId("objective-title-input"));
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		expect(saveButton).toBeDisabled();

		// Add task and fill both title and description
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "Test Task Title");
		await user.type(screen.getByTestId("task-description-0"), "Test Task Description");
		expect(saveButton).toBeEnabled();
	});

	it("requires all tasks to be filled for form to be valid", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		// Fill objective info first to enable add-task-button
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Now add task
		await user.click(screen.getByTestId("add-task-button"));

		// First task - add title to make description field visible
		await user.type(screen.getByTestId("task-title-0"), "First task title");
		await user.type(screen.getByTestId("task-description-0"), "First task description");

		const saveButton = screen.getByTestId("add-objective-button");
		// Now the form should be valid since all required fields are filled
		expect(saveButton).not.toBeDisabled();
		expect(onSaveAction).not.toHaveBeenCalled();
	});

	it("new tasks start with empty descriptions", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		// Fill objective fields first
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Add first task
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "First task title");
		await user.type(screen.getByTestId("task-description-0"), "First task description");

		// Add second task
		await user.click(screen.getByTestId("add-task-button"));

		expect(screen.getByTestId("task-description-0")).toHaveValue("First task description");
		expect(screen.getByTestId("task-description-1")).toHaveValue("");
	});

	it("updates specific tasks without affecting others", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		// Fill objective fields first
		await user.type(screen.getByTestId("objective-title-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");

		// Add first task
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-0"), "First task title");
		await user.type(screen.getByTestId("task-description-0"), "First task description");

		// Add second task
		await user.click(screen.getByTestId("add-task-button"));
		await user.type(screen.getByTestId("task-title-1"), "Second task title");
		await user.type(screen.getByTestId("task-description-1"), "Second task description");

		// Update first task description
		await user.clear(screen.getByTestId("task-description-0"));
		await user.type(screen.getByTestId("task-description-0"), "Updated first task description");

		expect(screen.getByTestId("task-description-0")).toHaveValue("Updated first task description");
		expect(screen.getByTestId("task-description-1")).toHaveValue("Second task description");
	});
});
