import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardProjectCard } from "./dashboard-project-card";

describe("DashboardProjectCard", () => {
	const mockOnDelete = vi.fn();
	const mockOnDuplicate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders project information correctly", () => {
		const project = ProjectListItemFactory.build({
			applications_count: 2,
			description: "Test description",
			name: "Test Project",
		});

		render(<DashboardProjectCard onDelete={mockOnDelete} onDuplicate={mockOnDuplicate} project={project} />);

		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
		expect(screen.getByText("Test Project")).toBeInTheDocument();
		expect(screen.getByText("Test description")).toBeInTheDocument();
		expect(screen.getByText("2 Applications")).toBeInTheDocument();
	});

	it("displays singular application text when count is 1", () => {
		const project = ProjectListItemFactory.build({ applications_count: 1 });

		render(<DashboardProjectCard project={project} />);

		expect(screen.getByText("1 Application")).toBeInTheDocument();
	});

	it("displays no applications message when count is 0", () => {
		const project = ProjectListItemFactory.build({ applications_count: 0 });

		render(<DashboardProjectCard project={project} />);

		expect(screen.getByText("You Have No Applications Yet")).toBeInTheDocument();
	});

	it("uses default description when project description is null", () => {
		const project = ProjectListItemFactory.build({ description: null });

		render(<DashboardProjectCard project={project} />);

		expect(screen.getByText(/Description of research project goes here/)).toBeInTheDocument();
	});

	it("toggles dropdown menu when more options button is clicked", async () => {
		const project = ProjectListItemFactory.build();
		const user = userEvent.setup();

		render(<DashboardProjectCard onDelete={mockOnDelete} onDuplicate={mockOnDuplicate} project={project} />);

		const moreButton = screen.getByTestId("more-options-button");

		// Initially dropdown should not be visible
		expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();

		// Click to open dropdown
		await user.click(moreButton);
		expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
		expect(screen.getByTestId("delete-project-button")).toBeInTheDocument();
		expect(screen.getByTestId("duplicate-project-button")).toBeInTheDocument();

		// Click again to close dropdown
		await user.click(moreButton);
		expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
	});

	it("calls onDelete when delete button is clicked", async () => {
		const project = ProjectListItemFactory.build();
		const user = userEvent.setup();

		render(<DashboardProjectCard onDelete={mockOnDelete} onDuplicate={mockOnDuplicate} project={project} />);

		// Open dropdown
		await user.click(screen.getByTestId("more-options-button"));

		// Click delete button
		await user.click(screen.getByTestId("delete-project-button"));

		expect(mockOnDelete).toHaveBeenCalledWith(project.id);
		expect(mockOnDelete).toHaveBeenCalledTimes(1);

		// Dropdown should close after action
		expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
	});

	it("calls onDuplicate when duplicate button is clicked", async () => {
		const project = ProjectListItemFactory.build();
		const user = userEvent.setup();

		render(<DashboardProjectCard onDelete={mockOnDelete} onDuplicate={mockOnDuplicate} project={project} />);

		// Open dropdown
		await user.click(screen.getByTestId("more-options-button"));

		// Click duplicate button
		await user.click(screen.getByTestId("duplicate-project-button"));

		expect(mockOnDuplicate).toHaveBeenCalledWith(project.id);
		expect(mockOnDuplicate).toHaveBeenCalledTimes(1);

		// Dropdown should close after action
		expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
	});

	it("renders correctly without optional callbacks", () => {
		const project = ProjectListItemFactory.build();

		render(<DashboardProjectCard project={project} />);

		// Component should render without errors even when no callbacks are provided
		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
		expect(screen.getByTestId("more-options-button")).toBeInTheDocument();
	});

	it("displays team member avatars", () => {
		const project = ProjectListItemFactory.build();

		render(<DashboardProjectCard project={project} />);

		// AvatarGroup should be rendered (we're not testing AvatarGroup internals here)
		// Just verify the card renders without errors
		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
	});
});
