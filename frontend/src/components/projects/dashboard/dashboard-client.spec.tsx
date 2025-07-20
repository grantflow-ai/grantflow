import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { useUserStore } from "@/stores/user-store";
import { DashboardClient } from "./dashboard-client";

// Mock the user store
vi.mock("@/stores/user-store");

// Mock data for initialProjects
const initialProjects = [ProjectListItemFactory.build()];
const initialOrganizations = [
	{
		description: null,
		id: "org-1",
		logo_url: null,
		members_count: 1,
		name: "Test Org",
		projects_count: 1,
		role: "OWNER" as const,
	},
];
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
		render(
			<DashboardClient
				initialOrganizations={initialOrganizations}
				initialProjects={initialProjects}
				initialSelectedOrganizationId={initialSelectedOrganizationId}
			/>,
		);

		expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
		expect(screen.getByTestId("project-count")).toBeInTheDocument();
		expect(screen.getByTestId("application-count")).toBeInTheDocument();
	});

	it("renders project cards when projects exist", () => {
		render(
			<DashboardClient
				initialOrganizations={initialOrganizations}
				initialProjects={initialProjects}
				initialSelectedOrganizationId={initialSelectedOrganizationId}
			/>,
		);

		expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
	});

	it("renders empty state when there are no projects", () => {
		render(
			<DashboardClient
				initialOrganizations={initialOrganizations}
				initialProjects={[]}
				initialSelectedOrganizationId={initialSelectedOrganizationId}
			/>,
		);

		expect(screen.getByTestId("create-first-project-button")).toBeInTheDocument();
	});

	it("renders invite collaborators button", () => {
		render(
			<DashboardClient
				initialOrganizations={initialOrganizations}
				initialProjects={initialProjects}
				initialSelectedOrganizationId={initialSelectedOrganizationId}
			/>,
		);

		expect(screen.getByTestId("invite-collaborators-button")).toBeInTheDocument();
	});
});
