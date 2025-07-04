import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

// Mock CustomSidebarTrigger to make it testable
vi.mock("./customer-trigger", () => ({
  CustomSidebarTrigger: () => <div data-testid="custom-sidebar-trigger" />,
}));

// Mock NavMain similarly (just to check presence)
vi.mock("./nav-main", () => ({
  NavMain: () => <div data-testid="nav-main" />,
}));

describe("AppSidebar", () => {
  it("renders logo and title", () => {
    render(<AppSidebar />);
    expect(screen.getByAltText("logo")).toBeInTheDocument();
    expect(screen.getByText("GrantFlow")).toBeInTheDocument();
  });

  it("renders New Application button", () => {
    render(<AppSidebar />);
    expect(screen.getByText("New Application")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new application/i })).toBeInTheDocument();
  });

  it("renders two CustomSidebarTriggers", () => {
    render(<AppSidebar />);
    expect(screen.getAllByTestId("custom-sidebar-trigger")).toHaveLength(2);
  });

  it("renders NavMain content", () => {
    render(<AppSidebar />);
    expect(screen.getByTestId("nav-main")).toBeInTheDocument();
  });

  it("renders Support and Logout buttons", () => {
    render(<AppSidebar />);
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
