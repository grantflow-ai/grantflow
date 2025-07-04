import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavMain } from "./nav-main";

describe("NavMain", () => {
  it("renders Dashboard title and icon", () => {
    render(<NavMain />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByAltText("logo")).toBeInTheDocument();
  });

  it("renders Recent Applications section and its content", () => {
    render(<NavMain />);
    expect(screen.getByText("Recent Applications")).toBeInTheDocument();
    // Check search input
    expect(screen.getByPlaceholderText("Search application")).toBeInTheDocument();
    // Check for an example application name
    expect(screen.getAllByText(/Application name/i).length).toBeGreaterThan(0);
    // Check for status badges
    expect(screen.getByText(/Generating/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Working Draft/i).length).toBeGreaterThan(0);
  });

  it("renders Settings section and its items", () => {
    render(<NavMain />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Account Setting")).toBeInTheDocument();
    expect(screen.getByText("Billing and payments")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("collapses and expands Recent Applications when clicked", async () => {
    const user = userEvent.setup();
    render(<NavMain />);
    // Find the Recent Applications trigger
    const recentTrigger = screen.getByText("Recent Applications");
    // Should be open initially
    expect(screen.getByPlaceholderText("Search application")).toBeInTheDocument();
    // Click to collapse
    await user.click(recentTrigger);
    // Search input should disappear
    expect(screen.queryByPlaceholderText("Search application")).not.toBeInTheDocument();
    // Click again to expand
    await user.click(recentTrigger);
    expect(screen.getByPlaceholderText("Search application")).toBeInTheDocument();
  });

  it("collapses and expands Settings section when clicked", async () => {
    const user = userEvent.setup();
    render(<NavMain />);
    const settingsTrigger = screen.getByText("Settings");
    // Should be open initially
    expect(screen.getByText("Account Setting")).toBeInTheDocument();
    // Click to collapse
    await user.click(settingsTrigger);
    expect(screen.queryByText("Account Setting")).not.toBeInTheDocument();
    // Click again to expand
    await user.click(settingsTrigger);
    expect(screen.getByText("Account Setting")).toBeInTheDocument();
  });
});
