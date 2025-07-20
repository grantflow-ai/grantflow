import { ApplicationWithTemplateFactory, ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ResearchPlanPreview } from "./research-plan-preview";

// Helper function to clean up portal elements rendered by Radix UI
function cleanupPortals() {
	// Remove all Radix portals from the document
	const portals = document.querySelectorAll("[data-radix-portal]");
	portals.forEach((portal) => portal.remove());

	// Also remove any dropdown content that might be lingering
	const dropdownContent = document.querySelectorAll('[data-slot="dropdown-menu-content"]');
	dropdownContent.forEach((content) => content.remove());
}

describe("ResearchPlanPreview Editing Mode", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		resetAllStores();
		cleanupPortals();
	});

	afterEach(() => {
		cleanup();
		cleanupPortals();
	});

	it("shows Edit Task option in dropdown menu initially", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		expect(dropdownTrigger).toBeInTheDocument();

		fireEvent.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);
	});

	it("enters editing mode when Edit Task is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="save-changes-button"]')).toBeInTheDocument();
	});

	it("shows Cancel Editing option when in editing mode", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(() => {
			const menuItem = screen.getByTestId("edit-task-menuitem");
			expect(menuItem).toBeInTheDocument();
		});

		const editMenuItem1 = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem1);

		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
				expect(menuItems[0].textContent).toContain("Cancel Editing");
			},
			{ timeout: 3000 },
		);
	});

	it("exits editing mode when Cancel Editing is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(() => {
			const menuItem = screen.getByTestId("edit-task-menuitem");
			expect(menuItem).toBeInTheDocument();
		});

		const editMenuItem1 = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem1);

		await user.click(dropdownTrigger!);

		await waitFor(() => {
			const menuItem = screen.getByTestId("edit-task-menuitem");
			expect(menuItem).toBeInTheDocument();
		});

		const editMenuItem2 = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem2);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="save-changes-button"]')).not.toBeInTheDocument();
	});

	it("displays editable form fields when in editing mode", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(screen.getByLabelText("Objective name")).toBeInTheDocument();
		expect(screen.getByLabelText("Objective description")).toBeInTheDocument();
		expect(screen.getByLabelText("Task description")).toBeInTheDocument();
	});

	it("pre-fills form fields with existing data", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(screen.getByDisplayValue("Test objective title")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test objective description")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test task description")).toBeInTheDocument();
	});

	it("allows editing objective title", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated objective title");

		expect(screen.getByDisplayValue("Updated objective title")).toBeInTheDocument();
	});

	it("allows editing objective description", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		const descriptionInput = screen.getByLabelText("Objective description");
		await user.clear(descriptionInput);
		await user.type(descriptionInput, "Updated objective description");

		expect(screen.getByDisplayValue("Updated objective description")).toBeInTheDocument();
	});

	it("allows editing task description", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		const taskInput = screen.getByLabelText("Task description");
		await user.clear(taskInput);
		await user.type(taskInput, "Updated task description");

		expect(screen.getByDisplayValue("Updated task description")).toBeInTheDocument();
	});

	it("shows add task button when in editing mode", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(container.querySelector('[data-testid="add-task-button"]')).toBeInTheDocument();
	});

	it("adds new task when add button is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(screen.getAllByLabelText("Task description")).toHaveLength(1);

		const addButton = container.querySelector('[data-testid="add-task-button"]');
		await user.click(addButton!);

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);
	});

	it("shows delete button for tasks when in editing mode", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(container.querySelector('[data-testid="delete-task-button"]')).toBeInTheDocument();
	});

	it("removes task when delete button is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "Test objective description",
				number: 1,
				research_tasks: [
					{ description: "Task 1", number: 1, title: "Task 1" },
					{ description: "Task 2", number: 2, title: "Task 2" },
				],
				title: "Test objective title",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(screen.getAllByLabelText("Task description")).toHaveLength(2);

		const deleteButtons = container.querySelectorAll('[data-testid="delete-task-button"]');
		await user.click(deleteButtons[0]);

		await waitFor(() => {
			expect(screen.getAllByLabelText("Task description")).toHaveLength(1);
		});
	});

	it("exits editing mode when Save Changes is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		const saveButton = container.querySelector('[data-testid="save-changes-button"]');
		await user.click(saveButton!);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="save-changes-button"]')).not.toBeInTheDocument();
	});

	it("displays updated content after saving changes", async () => {
		const mockLog = vi.spyOn(console, "info").mockImplementation(() => {});

		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		const titleInput = screen.getByLabelText("Objective name");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated title");

		const saveButton = container.querySelector('[data-testid="save-changes-button"]');
		await user.click(saveButton!);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).not.toBeInTheDocument();
		expect(screen.getByText("Test objective title")).toBeInTheDocument();

		mockLog.mockRestore();
	});

	it("does not show editing controls when not in editing mode", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="save-changes-button"]')).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Objective name")).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="delete-task-button"]')).not.toBeInTheDocument();
	});

	it("shows static content when not in editing mode", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Test objective title")).toBeInTheDocument();
		expect(screen.getByText("Test objective description")).toBeInTheDocument();
		expect(screen.getByText("Task: Test task description")).toBeInTheDocument();
	});

	it("handles multiple objectives independently", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "First objective description",
				number: 1,
				research_tasks: [
					{
						description: "First task description",
						number: 1,
						title: "First task title",
					},
				],
				title: "First objective",
			}),
			ResearchObjectiveFactory.build({
				description: "Second objective description",
				number: 2,
				research_tasks: [
					{
						description: "Second task description",
						number: 1,
						title: "Second task title",
					},
				],
				title: "Second objective",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const allButtons = container.querySelectorAll('[data-testid="menu-trigger"]');
		expect(allButtons).toHaveLength(2);

		await user.click(allButtons[0]);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="edit-task-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const editMenuItem = document.querySelector('[data-testid="edit-task-menuitem"]')!;
		await user.click(editMenuItem);

		expect(container.querySelector('[data-testid="edit-objective-title"]')).toBeInTheDocument();
		expect(screen.getByText("Second objective")).toBeInTheDocument();
	});
});

describe("ResearchPlanPreview Display Mode", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		resetAllStores();
		cleanupPortals();
	});

	afterEach(() => {
		cleanup();
		cleanupPortals();
	});

	it("shows empty state when no objectives exist", () => {
		useApplicationStore.setState({
			application: ApplicationWithTemplateFactory.build({ research_objectives: [] }),
		});

		const { container } = render(<ResearchPlanPreview />);

		expect(container.querySelector('[data-testid="empty-state"]')).toBeInTheDocument();
	});

	it("displays objective cards in grid layout", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Test objective title")).toBeInTheDocument();
		expect(screen.getByText("Test objective description")).toBeInTheDocument();
	});

	it("displays task information within objectives", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		expect(container.querySelector('[data-testid="tasks-section"]')).toBeInTheDocument();
		expect(screen.getByText("Task: Test task description")).toBeInTheDocument();
	});

	it("shows objective index badges", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("shows task index badges", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("1.1")).toBeInTheDocument();
	});

	it("displays drag handles for objectives", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByRole("button", { name: /drag to reorder objective/i })).toBeInTheDocument();
	});

	it("shows remove option in dropdown menu", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);
	});

	it("calls removeObjective when remove is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();
		expect(screen.getByTestId("delete-dialog-description")).toBeInTheDocument();

		const confirmButton = screen.getByTestId("confirm-delete-button");
		await user.click(confirmButton);

		expect(mockRemoveObjective).toHaveBeenCalledWith(1);
	});

	it("shows delete confirmation dialog when remove option is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();
		expect(screen.getByTestId("delete-dialog-description")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-delete-button")).toBeInTheDocument();
		expect(screen.getByTestId("confirm-delete-button")).toBeInTheDocument();
	});

	it("displays correct dialog content for delete confirmation", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		const dialogTitle = screen.getByTestId("delete-dialog-title");
		expect(dialogTitle.textContent).toBe("Are you sure you want to delete this objective?");

		const dialogDescription = screen.getByTestId("delete-dialog-description");
		expect(dialogDescription.textContent).toBe(
			"All content within this objective and all its associated tasks. will be permanently removed. This action cannot be undone.",
		);

		const cancelButton = screen.getByTestId("cancel-delete-button");
		expect(cancelButton.textContent).toBe("Cancel");

		const confirmButton = screen.getByTestId("confirm-delete-button");
		expect(confirmButton.textContent).toBe("Delete Objective");
	});

	it("closes dialog when cancel button is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const cancelButton = screen.getByTestId("cancel-delete-button");
		await user.click(cancelButton);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).not.toHaveBeenCalled();
	});

	it("closes dialog when close button (X) is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const closeButton = screen.getByRole("button", { name: /close/i });
		await user.click(closeButton);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).not.toHaveBeenCalled();
	});

	it("calls removeObjective and closes dialog when confirm button is clicked", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTrigger = container.querySelector('[data-testid="menu-trigger"]');
		await user.click(dropdownTrigger!);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const confirmButton = screen.getByTestId("confirm-delete-button");
		await user.click(confirmButton);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("delete-dialog-description")).not.toBeInTheDocument();

		expect(mockRemoveObjective).toHaveBeenCalledWith(1);
	});

	it("handles multiple objectives delete dialogs independently", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			}),
			ResearchObjectiveFactory.build({
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTriggers = container.querySelectorAll('[data-testid="menu-trigger"]');
		expect(dropdownTriggers).toHaveLength(2);

		await user.click(dropdownTriggers[1]);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const confirmButton = screen.getByTestId("confirm-delete-button");
		await user.click(confirmButton);

		expect(mockRemoveObjective).toHaveBeenCalledWith(2);
	});

	it("dialog state resets correctly between different objectives", async () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			}),
			ResearchObjectiveFactory.build({
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const mockRemoveObjective = vi.spyOn(useWizardStore.getState(), "removeObjective");

		const { container } = render(<ResearchPlanPreview />);

		const dropdownTriggers = container.querySelectorAll('[data-testid="menu-trigger"]');

		await user.click(dropdownTriggers[0]);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem1 = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem1);

		const cancelButton = screen.getByTestId("cancel-delete-button");
		await user.click(cancelButton);

		expect(screen.queryByTestId("delete-dialog-title")).not.toBeInTheDocument();

		await user.click(dropdownTriggers[1]);

		await waitFor(
			() => {
				const menuItems = document.querySelectorAll('[data-testid="remove-menuitem"]');
				expect(menuItems.length).toBeGreaterThan(0);
			},
			{ timeout: 3000 },
		);

		const removeMenuItem2 = document.querySelector('[data-testid="remove-menuitem"]')!;
		await user.click(removeMenuItem2);

		expect(screen.getByTestId("delete-dialog-title")).toBeInTheDocument();

		const confirmButton = screen.getByTestId("confirm-delete-button");
		await user.click(confirmButton);

		expect(mockRemoveObjective).toHaveBeenCalledWith(2);
	});

	it("displays multiple objectives with different numbers", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "First objective description",
				number: 1,
				research_tasks: [{ description: "First task", number: 1, title: "First task" }],
				title: "First objective",
			}),
			ResearchObjectiveFactory.build({
				description: "Second objective description",
				number: 2,
				research_tasks: [{ description: "Second task", number: 1, title: "Second task" }],
				title: "Second objective",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("First objective")).toBeInTheDocument();
		expect(screen.getByText("Second objective")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("displays multiple tasks within an objective", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "Test objective description",
				number: 1,
				research_tasks: [
					{ description: "First task description", number: 1, title: "First task" },
					{ description: "Second task description", number: 2, title: "Second task" },
				],
				title: "Test objective title",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByText("Task: First task description")).toBeInTheDocument();
		expect(screen.getByText("Task: Second task description")).toBeInTheDocument();
		expect(screen.getByText("1.1")).toBeInTheDocument();
		expect(screen.getByText("1.2")).toBeInTheDocument();
	});

	it("handles objectives with fallback task titles", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "Test objective description",
				number: 1,
				research_tasks: [{ description: undefined, number: 1, title: "Fallback task title" }],
				title: "Test objective title",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		const taskDisplay = container.querySelector('[data-testid="task-display"]');
		expect(taskDisplay?.textContent).toBe("Task: Fallback task title");
	});

	it("displays task drag handles", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview />);

		expect(screen.getByRole("button", { name: /drag to reorder task/i })).toBeInTheDocument();
	});

	it("does not show task management controls in display mode", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
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
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		const { container } = render(<ResearchPlanPreview />);

		expect(container.querySelector('[data-testid="delete-task-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="add-task-button"]')).not.toBeInTheDocument();
	});
});
