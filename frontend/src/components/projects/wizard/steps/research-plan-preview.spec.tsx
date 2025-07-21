import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";

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

describe.sequential("ResearchPlanPreview Display Mode", () => {
	beforeEach(() => {
		resetAllStores();
		cleanupPortals();
		setupAuthenticatedTest();

		// Set up organization store with a selected organization for tests that need it
		useOrganizationStore.setState({
			selectedOrganizationId: "mock-organization-id",
		});
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
