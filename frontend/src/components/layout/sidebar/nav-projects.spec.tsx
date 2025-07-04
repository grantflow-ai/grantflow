import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavProjects } from "./nav-projects";

describe("NavProjects", () => {
  it("renders My Workspace section and menu items", () => {
    render(<NavProjects />);
    
    // Section header
    expect(screen.getByText("My Workspace")).toBeInTheDocument();

    // Menu items inside collapsible (should be visible by default if defaultOpen is true; here it isn’t)
    expect(screen.queryByText("Account Setting")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing and payments")).not.toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("toggles collapsible content on click", async () => {
    const user = userEvent.setup();
    render(<NavProjects />);

    // Should be hidden initially
    expect(screen.queryByText("Account Setting")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText("My Workspace"));

    // Items should now appear
    expect(screen.getByText("Account Setting")).toBeInTheDocument();
    expect(screen.getByText("Billing and payments")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    // Click again to collapse
    await user.click(screen.getByText("My Workspace"));

    // Items should disappear again
    expect(screen.queryByText("Account Setting")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing and payments")).not.toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
