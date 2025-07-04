import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardProjectCard } from "./dashboard-project-card";

describe("DashboardProjectCard", () => {
  const mockOnDelete = vi.fn();
  const mockOnDuplicate = vi.fn();

  // fake team members required by the component
  const teamMembers = [
    { backgroundColor: "#369e94", initials: "NH" },
    { backgroundColor: "#9e366f", initials: "VH" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project name and description", () => {
    const project = ProjectListItemFactory.build({
      applications_count: 2,
      description: "Test description",
      name: "Test Project",
    });

    render(
      <DashboardProjectCard
        project={project}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
        projectTeamMembers={teamMembers}
      />
    );

    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("shows delete and duplicate options when dropdown is opened", async () => {
    const project = ProjectListItemFactory.build();
    const user = userEvent.setup();

    render(
      <DashboardProjectCard
        project={project}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
        projectTeamMembers={teamMembers}
      />
    );

    // open dropdown
    await user.click(screen.getByRole("button")); // should be the MoreVertical icon button

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
  });

  it("calls onDelete when Delete is clicked", async () => {
    const project = ProjectListItemFactory.build();
    const user = userEvent.setup();

    render(
      <DashboardProjectCard
        project={project}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
        projectTeamMembers={teamMembers}
      />
    );

    await user.click(screen.getByRole("button")); // open dropdown
    await user.click(screen.getByText("Delete"));

    expect(mockOnDelete).toHaveBeenCalledWith(project.id);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("calls onDuplicate when Duplicate is clicked", async () => {
    const project = ProjectListItemFactory.build();
    const user = userEvent.setup();

    render(
      <DashboardProjectCard
        project={project}
        onDelete={mockOnDelete}
        onDuplicate={mockOnDuplicate}
        projectTeamMembers={teamMembers}
      />
    );

    await user.click(screen.getByRole("button")); // open dropdown
    await user.click(screen.getByText("Duplicate"));

    expect(mockOnDuplicate).toHaveBeenCalledWith(project.id);
    expect(mockOnDuplicate).toHaveBeenCalledTimes(1);
  });

  it("renders team member initials", () => {
    const project = ProjectListItemFactory.build();

    render(
      <DashboardProjectCard
        project={project}
        projectTeamMembers={teamMembers}
      />
    );

    for (const member of teamMembers) {
      expect(screen.getByText(member.initials)).toBeInTheDocument();
    }
  });

  it("renders even without onDelete/onDuplicate callbacks", () => {
    const project = ProjectListItemFactory.build();

    render(
      <DashboardProjectCard
        project={project}
        projectTeamMembers={teamMembers}
      />
    );

    expect(screen.getByText(project.name)).toBeInTheDocument();
  });
});
