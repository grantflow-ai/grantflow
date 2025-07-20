import { ProjectListItemFactory } from "::testing/factories";
import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";
import { DashboardStats } from "./dashboard-stats";

afterEach(() => {
	cleanup();
});

describe("DashboardStats", () => {
	it("renders correct project and application counts", () => {
		const initialProjects = [
			ProjectListItemFactory.build({ applications_count: 2 }),
			ProjectListItemFactory.build({ applications_count: 3 }),
		];

		const { container } = render(<DashboardStats initialProjects={initialProjects} />);

		// Assert project count
		expect(container.querySelector('[data-testid="project-count"]')).toHaveTextContent("2");

		// Assert total applications count
		expect(container.querySelector('[data-testid="application-count"]')).toHaveTextContent("5");
	});
});
