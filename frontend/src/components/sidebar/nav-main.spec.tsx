import { ApplicationCardDataFactory, ListApplicationsResponseFactory, ProjectFactory } from "::testing/factories";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { listOrganizationApplications } from "@/actions/grant-applications";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { NavMain } from "./nav-main";

vi.mock("@/actions/grant-applications");
vi.mock("next/navigation", () => ({
	usePathname: vi.fn().mockReturnValue("/"),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
	})),
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

const initialOrganizationState = useOrganizationStore.getState();

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	act(() => {
		useNavigationStore.getState().reset();
		useOrganizationStore.setState(initialOrganizationState);
		useProjectStore.getState().reset();
	});
});

describe("NavMain", () => {
	beforeEach(() => {
		const project = ProjectFactory.build({
			id: "test-project-id",
			name: "Test Project",
		});
		act(() => {
			useNavigationStore.setState({
				activeProjectId: "test-project-id",
				activeProjectName: "Test Project",
			});
			useOrganizationStore.setState({
				selectedOrganizationId: "test-org-id",
			});
			useProjectStore.setState({
				project,
			});
		});
	});

	describe("Recent Applications", () => {
		it("shows search input when there are 6 or more applications", async () => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: ApplicationCardDataFactory.batch(7),
			});
			vi.mocked(listOrganizationApplications).mockResolvedValue(mockApplications);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("recent-applications-trigger"));
			expect(await screen.findByTestId("search-input")).toBeInTheDocument();
		});

		it("hides search input when there are fewer than 6 applications", async () => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: ApplicationCardDataFactory.batch(5),
			});
			vi.mocked(listOrganizationApplications).mockResolvedValue(mockApplications);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("recent-applications-trigger"));
			await screen.findByText(mockApplications.applications[0]?.title ?? "");
			expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
		});
	});

	describe("Settings Links by Role", () => {
		beforeEach(() => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: [],
			});
			vi.mocked(listOrganizationApplications).mockResolvedValue(mockApplications);
		});

		it("shows all settings links for OWNER role", async () => {
			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("settings-trigger"));
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-billing")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-members")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-notifications")).toBeInTheDocument();
		});

		it("hides billing and members links for COLLABORATOR role", async () => {
			render(
				<SidebarProvider>
					<NavMain userRole="COLLABORATOR" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("settings-trigger"));
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.queryByTestId("organization-settings-billing")).not.toBeInTheDocument();
			expect(screen.queryByTestId("organization-settings-members")).not.toBeInTheDocument();
		});

		it("shows billing and members links for ADMIN role", async () => {
			render(
				<SidebarProvider>
					<NavMain userRole="ADMIN" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("settings-trigger"));
			expect(screen.getByTestId("organization-settings-account")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-billing")).toBeInTheDocument();
			expect(screen.getByTestId("organization-settings-members")).toBeInTheDocument();
		});
	});

	describe("handleOpenApplication", () => {
		beforeEach(() => {
			const projectWithCount = {
				applications_count: 1,
				description: null,
				grant_applications: [],
				id: "test-project-id",
				logo_url: null,
				members: [],
				name: "Test Project",
				role: "OWNER" as const,
			};
			act(() => {
				useProjectStore.setState({
					projects: [projectWithCount],
				});
			});
		});

		it("calls navigateToApplication with the correct parameters", async () => {
			const navigateToApplicationSpy = vi.spyOn(useNavigationStore.getState(), "navigateToApplication");
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: ApplicationCardDataFactory.batch(1, { project_id: "test-project-id" }),
			});
			vi.mocked(listOrganizationApplications).mockResolvedValue(mockApplications);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await userEvent.click(screen.getByTestId("recent-applications-trigger"));
			const [application] = mockApplications.applications;
			await screen.findByText(application?.title ?? "");
			await userEvent.click(screen.getByTestId(`recent-application-${application?.id}`));

			expect(navigateToApplicationSpy).toHaveBeenCalledWith(
				"test-project-id",
				"Test Project",
				application?.id,
				application?.title,
			);
		});
	});

	describe("Admin Navigation", () => {
		beforeEach(() => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: [],
			});
			vi.mocked(listOrganizationApplications).mockResolvedValue(mockApplications);
		});

		it("shows admin button when isBackofficeAdmin is true", () => {
			render(
				<SidebarProvider>
					<NavMain isBackofficeAdmin={true} userRole="OWNER" />
				</SidebarProvider>,
			);

			expect(screen.getByTestId("admin-button")).toBeInTheDocument();
		});

		it("hides admin button when isBackofficeAdmin is false", () => {
			render(
				<SidebarProvider>
					<NavMain isBackofficeAdmin={false} userRole="OWNER" />
				</SidebarProvider>,
			);

			expect(screen.queryByTestId("admin-button")).not.toBeInTheDocument();
		});

		it("hides admin button when isBackofficeAdmin is undefined", () => {
			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);

			expect(screen.queryByTestId("admin-button")).not.toBeInTheDocument();
		});

		it("admin button links to granting institutions page", () => {
			render(
				<SidebarProvider>
					<NavMain isBackofficeAdmin={true} userRole="OWNER" />
				</SidebarProvider>,
			);

			const adminButton = screen.getByTestId("admin-button");
			const link = adminButton.closest("a");
			expect(link).toHaveAttribute("href", "/admin/granting-institutions");
		});
	});
});
