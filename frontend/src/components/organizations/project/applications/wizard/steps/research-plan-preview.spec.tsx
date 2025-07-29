import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";

import { ResearchPlanPreview } from "./research-plan-preview";

function cleanupPortals() {
	const portals = document.querySelectorAll("[data-radix-portal]");
	portals.forEach((portal) => portal.remove());

	const dropdownContent = document.querySelectorAll('[data-slot="dropdown-menu-content"]');
	dropdownContent.forEach((content) => content.remove());
}

describe.sequential("ResearchPlanPreview Display Mode", () => {
	let mockDialogRef: { current: { close: () => void; open: (content: any) => void } | null };

	beforeEach(() => {
		resetAllStores();
		cleanupPortals();
		setupAuthenticatedTest();

		useOrganizationStore.setState({
			selectedOrganizationId: "mock-organization-id",
		});

		mockDialogRef = {
			current: {
				close: vi.fn(),
				open: vi.fn(),
			},
		};
	});

	afterEach(() => {
		cleanup();
		cleanupPortals();
	});

	it("shows empty state when no objectives exist", () => {
		useApplicationStore.setState({
			application: ApplicationWithTemplateFactory.build({ research_objectives: [] }),
		});

		const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

		expect(screen.getByText("1.1")).toBeInTheDocument();
	});

	it("displays drag handles for objectives", () => {
		const mockObjectives = [
			ResearchObjectiveFactory.build({
				description: "First objective description",
				number: 1,
				research_tasks: [
					{
						description: "Test task description",
						number: 1,
						title: "Test task title",
					},
				],
				title: "First objective title",
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
				title: "Second objective title",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

		expect(screen.getAllByRole("button", { name: /drag to reorder objective/i })).toHaveLength(2);
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

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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

		const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

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
						description: "First task description",
						number: 1,
						title: "First task title",
					},
					{
						description: "Second task description",
						number: 2,
						title: "Second task title",
					},
				],
				title: "Test objective title",
			}),
		];

		const application = ApplicationWithTemplateFactory.build({
			research_objectives: mockObjectives,
		});

		useApplicationStore.setState({ application });

		render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

		expect(screen.getAllByRole("button", { name: /drag to reorder task/i })).toHaveLength(2);
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

		const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

		expect(container.querySelector('[data-testid="delete-task-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="add-task-button"]')).not.toBeInTheDocument();
	});

	describe("Grid Layout Logic", () => {
		it("applies correct grid classes for different objective counts", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({ number: 1, title: "Obj 1" }),
				ResearchObjectiveFactory.build({ number: 2, title: "Obj 2" }),
				ResearchObjectiveFactory.build({ number: 3, title: "Obj 3" }),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const gridContainer = container.querySelector(".grid");
			expect(gridContainer).toHaveClass("grid-cols-3");
		});

		it("positions single objective with col-start-1", () => {
			const mockObjectives = [ResearchObjectiveFactory.build({ number: 1, title: "Single Obj" })];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const singleObjective = container.querySelector(".col-start-1");
			expect(singleObjective).toBeInTheDocument();
		});

		it("applies dynamic grid styles for large objective counts", () => {
			const mockObjectives = Array.from({ length: 6 }, (_, i) =>
				ResearchObjectiveFactory.build({ number: i + 1, title: `Obj ${i + 1}` }),
			);

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const gridContainer = container.querySelector(".grid");
			expect(gridContainer).toBeInTheDocument();
		});
	});

	describe("Drag and Drop States", () => {
		it("disables drag handle for single objective", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({
					number: 1,
					research_tasks: [{ description: "Task", number: 1, title: "Task" }],
					title: "Single Objective",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const disabledGrip = container.querySelector(".text-gray-300");
			expect(disabledGrip).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /drag to reorder objective/i })).not.toBeInTheDocument();
		});

		it("enables drag handle for multiple objectives", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({ number: 1, title: "Obj 1" }),
				ResearchObjectiveFactory.build({ number: 2, title: "Obj 2" }),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const dragButtons = screen.getAllByRole("button", { name: /drag to reorder objective/i });
			expect(dragButtons).toHaveLength(2);
		});

		it("disables task drag handle for single task", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({
					number: 1,
					research_tasks: [{ description: "Single task", number: 1, title: "Single task" }],
					title: "Objective",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			const { container } = render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const disabledTaskGrip = container.querySelector(".text-gray-300");
			expect(disabledTaskGrip).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /drag to reorder task/i })).not.toBeInTheDocument();
		});

		it("enables task drag handle for multiple tasks", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({
					number: 1,
					research_tasks: [
						{ description: "Task 1", number: 1, title: "Task 1" },
						{ description: "Task 2", number: 2, title: "Task 2" },
					],
					title: "Objective",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const taskDragButtons = screen.getAllByRole("button", { name: /drag to reorder task/i });
			expect(taskDragButtons).toHaveLength(2);
		});
	});

	describe("Task Content Fallback", () => {
		it("displays task description when available", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({
					number: 1,
					research_tasks: [
						{
							description: "Detailed task description",
							number: 1,
							title: "Basic title",
						},
					],
					title: "Objective",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			expect(screen.getByText("Task: Detailed task description")).toBeInTheDocument();
		});

		it("falls back to task title when description is empty", () => {
			const mockObjectives = [
				ResearchObjectiveFactory.build({
					number: 1,
					research_tasks: [
						{
							description: undefined,
							number: 1,
							title: "Fallback title",
						},
					],
					title: "Objective",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				research_objectives: mockObjectives,
			});

			useApplicationStore.setState({ application });

			render(<ResearchPlanPreview dialogRef={mockDialogRef} />);

			const taskDisplay = screen.getByTestId("task-display");
			expect(taskDisplay).toHaveTextContent("Task: Fallback title");
		});
	});
});
