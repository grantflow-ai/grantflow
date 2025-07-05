import { render, screen } from "@testing-library/react";
import { DashboardStats } from "./dashboard-stats";

describe("DashboardStats", () => {
  it("renders correct project and application counts", () => {
    const initialProjects = [
      { id: "1", name: "Project 1", description: "desc", applications_count: 2 },
      { id: "2", name: "Project 2", description: "desc", applications_count: 3 },
    ];

    render(<DashboardStats initialProjects={initialProjects} />);

    // Assert project count
    expect(screen.getByTestId("project-count")).toHaveTextContent("2");

    // Assert total applications count
    expect(screen.getByTestId("application-count")).toHaveTextContent("5");
  });
});
