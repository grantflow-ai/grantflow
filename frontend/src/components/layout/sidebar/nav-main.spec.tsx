import { ApplicationCardDataFactory, ListApplicationsResponseFactory, ProjectFactory } from "::testing/factories";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { listApplications } from "@/actions/grant-applications";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { NavMain } from "./nav-main";

vi.mock("@/actions/grant-applications");

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
			vi.mocked(listApplications).mockResolvedValue(mockApplications);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			expect(await screen.findByTestId("search-input")).toBeInTheDocument();
		});

		it("hides search input when there are fewer than 6 applications", async () => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: ApplicationCardDataFactory.batch(5),
			});
			vi.mocked(listApplications).mockResolvedValue(mockApplications);

			render(
				<SidebarProvider>
					<NavMain userRole="OWNER" />
				</SidebarProvider>,
			);
			await screen.findByText(mockApplications.applications[0].title);
			expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
		});
	});

	describe("Settings Links by Role", () => {
		beforeEach(() => {
			const mockApplications = ListApplicationsResponseFactory.build({
				applications: [],
			});
			vi.mocked(listApplications).mockResolvedValue(mockApplications);
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
