import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { listApplications } from "@/actions/grant-applications";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import type { API } from "@/types/api-types";
import { NavMain } from "./nav-main";

vi.mock("@/actions/grant-applications");
vi.mock("@/stores/navigation-store");
vi.mock("@/stores/organization-store");
vi.mock("@/stores/project-store");

const MOCK_APPLICATIONS: API.ListApplications.Http200.ResponseBody["applications"] = Array.from(
	{ length: 7 },
	(_, i) => ({
		created_at: new Date().toISOString(),
		id: `app-${i + 1}`,
		project_id: "test-project-id",
		status: "IN_PROGRESS",
		title: `Grant Application ${i + 1}`,
		updated_at: new Date().toISOString(),
	}),
);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("NavMain", () => {
	beforeEach(() => {
		vi.mocked(useNavigationStore).mockReturnValue({
			activeApplicationId: null,
			activeApplicationTitle: null,
			activeProjectId: "test-project-id",
			activeProjectName: "Test Project",
			clearActiveApplication: vi.fn(),
			clearActiveProject: vi.fn(),
			goBack: vi.fn(),
			navigateToApplication: vi.fn(),
			navigateToProject: vi.fn(),
			navigationHistory: [],
			setActiveApplication: vi.fn(),
			setActiveProject: vi.fn(),
		});

		vi.mocked(useOrganizationStore).mockReturnValue({
			organizations: [],
			selectedOrganization: null,
			selectedOrganizationId: "test-org-id",
			setOrganizations: vi.fn(),
			setSelectedOrganization: vi.fn(),
			setSelectedOrganizationId: vi.fn(),
		});

		vi.mocked(useProjectStore).mockReturnValue({
			clearProject: vi.fn(),
			project: { id: "test-project-id", name: "Test Project", role: "OWNER" },
			setProject: vi.fn(),
		} as any);
	});

	describe("Recent Applications", () => {
		it("shows search input when there are 6 or more applications", async () => {
			vi.mocked(listApplications).mockResolvedValue({
				applications: MOCK_APPLICATIONS,
				has_more: false,
			} as any);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			expect(await screen.findByTestId("search-input")).toBeInTheDocument();
		});

		it("hides search input when there are fewer than 6 applications", async () => {
			vi.mocked(listApplications).mockResolvedValue({
				applications: MOCK_APPLICATIONS.slice(0, 5),
				has_more: false,
			} as any);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await screen.findByText("Grant Application 1");
			expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
		});
	});

	describe("Settings Links by Role", () => {
		beforeEach(() => {
			vi.mocked(listApplications).mockResolvedValue({ applications: [] } as any);
		});

		it("shows all settings links for OWNER role", () => {
			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-billing")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-members")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-notifications")).toBeInTheDocument();
		});

		it("hides billing and members links for COLLABORATOR role", () => {
			render(
				<SidebarProvider>
					<NavMain userRole="COLLABORATOR" />
				</SidebarProvider>,
			);
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.queryByTestId("organization-settings-billing")).not.toBeInTheDocument();
			expect(screen.queryByTestId("organization-settings-members")).not.toBeInTheDocument();
		});

		it("shows billing and members links for ADMIN role", () => {
			render(
				<SidebarProvider>
					<NavMain userRole="ADMIN" />
				</SidebarProvider>,
			);
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-billing")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-members")).toBeInTheDocument();
		});
	});
});
