import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ObjectiveForm, type ObjectiveFormData } from "./objective-form";

describe("ObjectiveForm", () => {
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

		// Add a second task
		await user.click(screen.getByTestId("add-task-button"));
		expect(screen.getByTestId("task-description-1")).toBeInTheDocument();

		// Both tasks should be present
		expect(screen.getByTestId("task-description-0")).toBeInTheDocument();
		expect(screen.getByTestId("task-description-1")).toBeInTheDocument();
	});

	it("does not show remove button when only one task exists", () => {
		render(<ObjectiveForm {...defaultProps} />);

		expect(screen.queryByTestId("remove-task-0")).not.toBeInTheDocument();
	});

	it("shows validation errors when saving with empty fields", async () => {
		const user = userEvent.setup();
		const onSaveAction = vi.fn();
		render(<ObjectiveForm {...defaultProps} onSaveAction={onSaveAction} />);

		await user.click(screen.getByTestId("save-button"));

		expect(screen.getByTestId("objective-name-input-error")).toHaveTextContent("Objective name is required");
		expect(screen.getByTestId("objective-description-input-error")).toHaveTextContent(
			"Objective description is required",
		);
		expect(screen.getByTestId("task-description-0-error")).toHaveTextContent("Task description is required");
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

	it("clears validation errors when user types in fields", async () => {
		const user = userEvent.setup();
		render(<ObjectiveForm {...defaultProps} />);

		// Trigger validation errors
		await user.click(screen.getByTestId("save-button"));
		expect(screen.getByTestId("objective-name-input-error")).toHaveTextContent("Objective name is required");

		// Type in the field to clear error
		await user.type(screen.getByTestId("objective-name-input"), "Test");
		expect(screen.getByTestId("objective-name-input-error")).toHaveTextContent("");
	});
});
