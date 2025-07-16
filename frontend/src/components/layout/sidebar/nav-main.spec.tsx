import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { NavMain } from "./nav-main";

vi.mock("@/stores/navigation-store");
vi.mock("@/stores/project-store");

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

		vi.mocked(useProjectStore).mockReturnValue({
			clearProject: vi.fn(),
			project: {
				applications_count: 0,
				description: "Test description",
				grant_applications: [],
				id: "test-project-id",
				logo_url: null,
				members: [],
				name: "Test Project",
				role: "OWNER",
			},
			setProject: vi.fn(),
		});
	});

	it("renders all main parts correctly for OWNER role", async () => {
		const user = userEvent.setup();

		render(
			<SidebarProvider>
				<NavMain data-testid="nav-main" userRole="OWNER" />
			</SidebarProvider>,
		);

		expect(screen.getByTestId("dashboard-button")).toBeInTheDocument();

		expect(screen.getByTestId("recent-applications-trigger")).toBeInTheDocument();
		expect(screen.getByTestId("settings-trigger")).toBeInTheDocument();

		expect(screen.getByTestId("search-input")).toBeInTheDocument();
		expect(screen.getByTestId("recent-app-item")).toBeInTheDocument();

		const settingsTrigger = screen.getByTestId("settings-trigger");
		await user.click(settingsTrigger);

		expect(screen.getByTestId("settings-account")).toBeInTheDocument();
		expect(screen.getByTestId("settings-billing")).toBeInTheDocument();
		expect(screen.getByTestId("settings-members")).toBeInTheDocument();
		expect(screen.getByTestId("settings-notifications")).toBeInTheDocument();
	});

	it("hides billing and members links for MEMBER role", async () => {
		const user = userEvent.setup();

		render(
			<SidebarProvider>
				<NavMain data-testid="nav-main" userRole="MEMBER" />
			</SidebarProvider>,
		);

		const settingsTrigger = screen.getByTestId("settings-trigger");
		await user.click(settingsTrigger);

		expect(screen.getByTestId("settings-account")).toBeInTheDocument();
		expect(screen.queryByTestId("settings-billing")).not.toBeInTheDocument();
		expect(screen.queryByTestId("settings-members")).not.toBeInTheDocument();
		expect(screen.getByTestId("settings-notifications")).toBeInTheDocument();
	});

	it("shows billing and members links for ADMIN role", async () => {
		const user = userEvent.setup();

		render(
			<SidebarProvider>
				<NavMain data-testid="nav-main" userRole="ADMIN" />
			</SidebarProvider>,
		);

		const settingsTrigger = screen.getByTestId("settings-trigger");
		await user.click(settingsTrigger);

		expect(screen.getByTestId("settings-account")).toBeInTheDocument();
		expect(screen.getByTestId("settings-billing")).toBeInTheDocument();
		expect(screen.getByTestId("settings-members")).toBeInTheDocument();
		expect(screen.getByTestId("settings-notifications")).toBeInTheDocument();
	});
});
