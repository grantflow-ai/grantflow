import { render, screen } from "@testing-library/react";

import { NavMain } from "./nav-main";
import { SidebarProvider } from "@/components/ui/sidebar";

describe("NavMain", () => {
  it("renders all main parts correctly", () => {
    render(
       <SidebarProvider>

         <NavMain data-testid="nav-main" />
       </SidebarProvider>
     
    );

    // Top dashboard section
    expect(screen.getByTestId("dashboard-section")).toBeInTheDocument();

    // Triggers
    expect(screen.getByTestId("recent-applications-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("settings-trigger")).toBeInTheDocument();

    // Recent Applications content
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("recent-app-item")).toBeInTheDocument();

    // Settings items
    expect(screen.getByTestId("settings-account")).toBeInTheDocument();
    expect(screen.getByTestId("settings-billing")).toBeInTheDocument();
    expect(screen.getByTestId("settings-members")).toBeInTheDocument();
    expect(screen.getByTestId("settings-notifications")).toBeInTheDocument();
  });
});
