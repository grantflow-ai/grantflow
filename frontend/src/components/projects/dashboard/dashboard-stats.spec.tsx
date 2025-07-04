import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "./dashboard-stats";

describe("DashboardStats", () => {
  it("renders correct project and application counts", () => {
    const projects = [
      ProjectListItemFactory.build({ applications_count: 2 }),
      ProjectListItemFactory.build({ applications_count: 3 }),
    ];

    render(<DashboardStats initialProjects={projects} />);

    expect(screen.getByTestId("project-count")).toHaveTextContent("2");
    expect(screen.getByTestId("application-count")).toHaveTextContent("5");
  });

  it("renders zero counts when there are no projects", () => {
    render(<DashboardStats initialProjects={[]} />);

    expect(screen.getByTestId("project-count")).toHaveTextContent("0");
    expect(screen.getByTestId("application-count")).toHaveTextContent("0");
  });

  it("renders correct counts when applications_count is zero", () => {
    const projects = [
      ProjectListItemFactory.build({ applications_count: 0 }),
      ProjectListItemFactory.build({ applications_count: 0 }),
    ];

    render(<DashboardStats initialProjects={projects} />);

    expect(screen.getByTestId("project-count")).toHaveTextContent("2");
    expect(screen.getByTestId("application-count")).toHaveTextContent("0");
  });
});
