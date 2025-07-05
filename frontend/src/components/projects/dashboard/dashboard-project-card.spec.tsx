import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardProjectCard } from "./dashboard-project-card";

test("calls onDelete and onDuplicate handlers", async () => {
  const user = userEvent.setup(); // create user instance
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();

  render(
    <DashboardProjectCard
      project={{ id: "1", name: "Test Project", description: "A test project" }}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      projectTeamMembers={[{ backgroundColor: "#369e94", initials: "NH" }]}
    />
  );

  // Open the dropdown menu
  await user.click(screen.getByTestId("project-card-menu-trigger"));

  // Now click Delete
  await user.click(await screen.findByTestId("project-card-delete"));
  expect(onDelete).toHaveBeenCalledWith("1");

  // Open again (if needed)
  await user.click(screen.getByTestId("project-card-menu-trigger"));
  await user.click(await screen.findByTestId("project-card-duplicate"));
  expect(onDuplicate).toHaveBeenCalledWith("1");
});
