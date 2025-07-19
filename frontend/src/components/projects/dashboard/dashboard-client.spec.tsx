import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { useUserStore } from "@/stores/user-store";
import { DashboardClient } from "./dashboard-client";

// Mock the user store
vi.mock("@/stores/user-store");

// Mock data for initialProjects
const initialProjects = [ProjectListItemFactory.build()];
const initialOrganizations = [{ 
	id: "org-1", 
	name: "Test Org", 
	description: null,
	logo_url: null,
	members_count: 1,
	projects_count: 1,
	role: "OWNER" as const 
}];
const initialSelectedOrganizationId = "org-1";

describe("DashboardClient", () => {
	beforeEach(() => {
		// Mock the user store to prevent welcome modal from showing
		vi.mocked(useUserStore).mockReturnValue({
			dismissWelcomeModal: vi.fn(), // This prevents the modal from showing
			hasSeenWelcomeModal: true,
		} as any);
	});

	it("renders dashboard header and stats", () => {
		render(<DashboardClient initialProjects={initialProjects} initialOrganizations={initialOrganizations} initialSelectedOrganizationId={initialSelectedOrganizationId} />);

		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
		expect(screen.getByTestId("project-count")).toBeInTheDocument();
		expect(screen.getByTestId("application-count")).toBeInTheDocument();
	});

	it("renders project cards when projects exist", () => {
		render(<DashboardClient initialProjects={initialProjects} initialOrganizations={initialOrganizations} initialSelectedOrganizationId={initialSelectedOrganizationId} />);

		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
	});

	it("renders empty state when there are no projects", () => {
		render(<DashboardClient initialProjects={[]} initialOrganizations={initialOrganizations} initialSelectedOrganizationId={initialSelectedOrganizationId} />);

		expect(screen.getByTestId("create-first-project-button")).toBeInTheDocument();
	});

	it("renders invite collaborators button", () => {
		render(<DashboardClient initialProjects={initialProjects} initialOrganizations={initialOrganizations} initialSelectedOrganizationId={initialSelectedOrganizationId} />);

		expect(screen.getByTestId("invite-collaborators-button")).toBeInTheDocument();
	});
});
