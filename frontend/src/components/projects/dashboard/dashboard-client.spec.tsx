// dashboard-client.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardClient } from "./dashboard-client";

// Mock stores
vi.mock("@/stores/project-store", () => ({
  useProjectStore: () => ({
    deleteProject: vi.fn(),
    duplicateProject: vi.fn(),
  }),
}));
vi.mock("@/stores/notification-store", () => ({
  useNotificationStore: () => ({
    addNotification: vi.fn(),
  }),
}));
vi.mock("@/stores/user-store", () => ({
  useUserStore: () => ({
    user: { displayName: "Test User", email: "test@example.com" },
  }),
}));

describe("DashboardClient", () => {
  it("renders dashboard header, stats, and project cards", () => {
    render(
      <SidebarProvider>
        <DashboardClient
          initialProjects={[
            {
              id: "project-1",
              name: "Test Project",
              applications_count: 0,
              description: null,
              logo_url: null,
              role: "OWNER",
            },
          ]}
        />
      </SidebarProvider>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Your one‑stop overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Research Projects/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Project/i)).toBeInTheDocument();
  });

  it("renders invite collaborators button", () => {
    render(
      <SidebarProvider>
        <DashboardClient
          initialProjects={[
            {
              id: "project-1",
              name: "Test Project",
              applications_count: 0,
              description: null,
              logo_url: null,
              role: "OWNER",
            },
          ]}
        />
      </SidebarProvider>
    );

    const inviteButton =
      screen.queryByRole("button", { name: /invite collaborators/i }) ||
      screen.queryByTestId("invite-collaborators");

    expect(inviteButton).toBeInTheDocument();
  });
});
