import { render, screen } from "@testing-library/react";
import { DashboardClient } from "./dashboard-client";
;

// Mock data for initialProjects
const initialProjects = [
  {
    id: "project-1",
    name: "AI Research Project",
    description: "Exploring AI applications",
  },
];

describe("DashboardClient", () => {
  it("renders dashboard header and stats", () => {
    render(<DashboardClient initialProjects={initialProjects} />);

    expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
  });

  it("renders project cards when projects exist", () => {
    render(<DashboardClient initialProjects={initialProjects} />);

    expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
  });

  it("renders empty state when there are no projects", () => {
    render(<DashboardClient initialProjects={[]} />);

    expect(
      screen.getByTestId("create-first-project-button")
    ).toBeInTheDocument();
  });

  it("renders invite collaborators button", () => {
    render(<DashboardClient initialProjects={initialProjects} />);

    expect(
      screen.getByTestId("invite-collaborators-button")
    ).toBeInTheDocument();
  });
});
