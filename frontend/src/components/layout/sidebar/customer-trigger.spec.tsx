import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CustomSidebarTrigger } from "./customer-trigger";

// Mock the useSidebar hook
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: vi.fn(),
}));

describe("CustomSidebarTrigger", () => {
  const toggleSidebarMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ChevronsLeft icon when sidebar is "expanded"', () => {
    const { useSidebar } = require("@/components/ui/sidebar");
    useSidebar.mockReturnValue({ state: "expanded", toggleSidebar: toggleSidebarMock });

    render(<CustomSidebarTrigger />);
    // Check for ChevronsLeft icon by label or SVG title if set, or by class
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByTestId("chevrons-left-icon")).toBeInTheDocument();
  });

  it('shows ChevronsRight icon when sidebar is "collapsed"', () => {
    const { useSidebar } = require("@/components/ui/sidebar");
    useSidebar.mockReturnValue({ state: "collapsed", toggleSidebar: toggleSidebarMock });

    render(<CustomSidebarTrigger />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByTestId("chevrons-right-icon")).toBeInTheDocument();
  });

  it("calls toggleSidebar on click", async () => {
    const user = userEvent.setup();
    const { useSidebar } = require("@/components/ui/sidebar");
    useSidebar.mockReturnValue({ state: "expanded", toggleSidebar: toggleSidebarMock });

    render(<CustomSidebarTrigger />);
    await user.click(screen.getByRole("button"));
    expect(toggleSidebarMock).toHaveBeenCalledTimes(1);
  });
});
