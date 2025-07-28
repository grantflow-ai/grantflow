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

		expect(screen.getByTestId("objective-name-input")).toBeInTheDocument();
		expect(screen.getByTestId("objective-description-input")).toBeInTheDocument();
		expect(screen.getByTestId("task-description-0")).toBeInTheDocument();
		expect(screen.getByTestId("add-task-button")).toBeInTheDocument();
		expect(screen.getByTestId("save-button")).toBeInTheDocument();
	});

	it("starts with one task by default", () => {
		render(<ObjectiveForm {...defaultProps} />);

		expect(screen.getByTestId("task-description-0")).toBeInTheDocument();
		expect(screen.queryByTestId("task-description-1")).not.toBeInTheDocument();
	});

	it("adds new task when add task button is clicked", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		await user.type(screen.getByTestId("task-description-0"), "First task description");
		await user.click(screen.getByTestId("add-task-button"));

		expect(screen.getByTestId("task-description-0")).toBeInTheDocument();
		expect(screen.getByTestId("task-description-1")).toBeInTheDocument();
	});

	it("allows adding multiple tasks", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		await user.type(screen.getByTestId("task-description-0"), "First task description");

		await user.click(screen.getByTestId("add-task-button"));
		expect(screen.getByTestId("task-description-1")).toBeInTheDocument();

		expect(screen.getByTestId("task-description-0")).toBeInTheDocument();
		expect(screen.getByTestId("task-description-1")).toBeInTheDocument();
	});

	it("does not show remove button when only one task exists", () => {
		render(<ObjectiveForm {...defaultProps} />);

		expect(screen.queryByTestId("remove-task-0")).not.toBeInTheDocument();
	});

	it("shows validation errors when attempting to save partially completed form", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();
		expect(onSaveAction).not.toHaveBeenCalled();
	});

	it("calls onSaveAction with correct data when form is valid", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		await user.type(screen.getByTestId("task-description-0"), "Test Task");

		await user.click(screen.getByTestId("save-button"));

		expect(onSaveAction).toHaveBeenCalledWith({
			description: "Test Description",
			name: "Test Objective",
			tasks: [
				expect.objectContaining({
					description: "Test Task",
				}),
			],
		});
	});

	it("populates form with initial data when provided", () => {
		const initialData: ObjectiveFormData = {
			description: "Initial Description",
			name: "Initial Objective",
			tasks: [
				{ description: "Initial Task 1", id: "1" },
				{ description: "Initial Task 2", id: "2" },
			],
		};

		render(<ObjectiveForm {...defaultProps} initialData={initialData} />);

		expect(screen.getByTestId("objective-name-input")).toHaveValue("Initial Objective");
		expect(screen.getByTestId("objective-description-input")).toHaveValue("Initial Description");
		expect(screen.getByTestId("task-description-0")).toHaveValue("Initial Task 1");
		expect(screen.getByTestId("task-description-1")).toHaveValue("Initial Task 2");
	});

	it("enables save button when all required fields are filled", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("task-description-0"), "Test Task");
		expect(saveButton).toBeEnabled();
	});

	it("keeps save button disabled when only whitespace is entered", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-name-input"), "   ");
		await user.type(screen.getByTestId("objective-description-input"), "   ");
		await user.type(screen.getByTestId("task-description-0"), "   ");
		expect(saveButton).toBeDisabled();
	});

	it("save button is disabled when form is invalid", () => {
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();
	});

	it("save button is enabled when all fields are filled", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		await user.type(screen.getByTestId("task-description-0"), "Test Task");

		expect(saveButton).toBeEnabled();
	});

	it("correctly validates form state based on field content", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		const saveButton = screen.getByTestId("save-button");

		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-name-input"), "   ");
		expect(saveButton).toBeDisabled();

		await user.clear(screen.getByTestId("objective-name-input"));
		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		expect(saveButton).toBeDisabled();
		await user.type(screen.getByTestId("task-description-0"), "Test Task");
		expect(saveButton).toBeEnabled();
	});

	it("requires all tasks to be filled for form to be valid", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.click(screen.getByTestId("add-task-button"));

		await user.type(screen.getByTestId("objective-name-input"), "Test Objective");
		await user.type(screen.getByTestId("objective-description-input"), "Test Description");
		await user.type(screen.getByTestId("task-description-0"), "First task");

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();

		await user.type(screen.getByTestId("task-description-1"), "Second task");
		expect(saveButton).toBeEnabled();
		expect(onSaveAction).not.toHaveBeenCalled();
	});

	it("new tasks start with empty descriptions", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		await user.type(screen.getByTestId("task-description-0"), "First task");

		await user.click(screen.getByTestId("add-task-button"));

		expect(screen.getByTestId("task-description-0")).toHaveValue("First task");
		expect(screen.getByTestId("task-description-1")).toHaveValue("");
	});

	it("updates specific tasks without affecting others", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		await user.click(screen.getByTestId("add-task-button"));

		await user.type(screen.getByTestId("task-description-0"), "First task");
		await user.type(screen.getByTestId("task-description-1"), "Second task");

		await user.clear(screen.getByTestId("task-description-0"));
		await user.type(screen.getByTestId("task-description-0"), "Updated first task");

		expect(screen.getByTestId("task-description-0")).toHaveValue("Updated first task");
		expect(screen.getByTestId("task-description-1")).toHaveValue("Second task");
	});
});
