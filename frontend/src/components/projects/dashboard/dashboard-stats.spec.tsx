import { render, screen } from "@testing-library/react";
import { ProjectListItemFactory } from "::testing/factories";
import { DashboardStats } from "./dashboard-stats";

describe("DashboardStats", () => {
	it("renders correct project and application counts", () => {
		const initialProjects = [
			ProjectListItemFactory.build({ applications_count: 2 }),
			ProjectListItemFactory.build({ applications_count: 3 }),
		];

		render(<DashboardStats initialProjects={initialProjects} />);

		// Assert project count
		expect(screen.getByTestId("project-count")).toHaveTextContent("2");

		// Assert total applications count
		expect(screen.getByTestId("application-count")).toHaveTextContent("5");
	});
});
