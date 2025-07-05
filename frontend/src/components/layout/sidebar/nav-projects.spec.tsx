import { render, screen, fireEvent } from "@testing-library/react";
import {  SidebarProvider } from "@/components/ui/sidebar";
import { NavProjects } from "./nav-projects";

describe("NavProjects", () => {
  it("renders workspace trigger and items correctly", () => {
    render(
      <SidebarProvider >
        <NavProjects />
      </SidebarProvider>
    );

    // click the workspace trigger
  const trigger = screen.getByTestId("workspace-trigger");
  fireEvent.click(trigger);

  // now assert the content appears
  expect(screen.getByTestId("workspace-item-account")).toBeInTheDocument();

    // Top trigger
    expect(screen.getByTestId("workspace-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-label")).toHaveTextContent("My Workspace");
    expect(screen.getByTestId("workspace-icon")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-chevron")).toBeInTheDocument();

    // Collapsible content
    expect(screen.getByTestId("workspace-content")).toBeInTheDocument();

    // Items inside
    expect(screen.getByTestId("workspace-item-account")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-item-billing")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-item-members")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-item-notifications")).toBeInTheDocument();
  });
});
