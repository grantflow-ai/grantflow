import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardProjectCard } from "./dashboard-project-card";

test("calls onDelete and onDuplicate handlers", async () => {
	const user = userEvent.setup(); // create user instance
	const onDelete = vi.fn();
	const onDuplicate = vi.fn();
	const project = ProjectListItemFactory.build();

	render(
		<DashboardProjectCard
			onDelete={onDelete}
			onDuplicate={onDuplicate}
			project={project}
			projectTeamMembers={[{ backgroundColor: "#369e94", initials: "NH" }]}
		/>,
	);

	// Open the dropdown menu
	await user.click(screen.getByTestId("project-card-menu-trigger"));

	// Now click Delete
	await user.click(await screen.findByTestId("project-card-delete"));
	expect(onDelete).toHaveBeenCalledWith(project.id);

	// Open again (if needed)
	await user.click(screen.getByTestId("project-card-menu-trigger"));
	await user.click(await screen.findByTestId("project-card-duplicate"));
	expect(onDuplicate).toHaveBeenCalledWith(project.id);
});
