import { ProjectListItemFactory } from "::testing/factories";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { DashboardProjectCard } from "./dashboard-project-card";

test("renders project card with basic information", () => {
	const project = ProjectListItemFactory.build();

	render(
		<DashboardProjectCard
			onDelete={vi.fn()}
			onDuplicate={vi.fn()}
			project={project}
			projectTeamMembers={[{ backgroundColor: "#369e94", initials: "NH" }]}
		/>,
	);

	expect(document.body).toHaveTextContent(project.name);
});
