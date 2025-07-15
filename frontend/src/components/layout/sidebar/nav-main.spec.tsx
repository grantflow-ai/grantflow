import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { NavMain } from "./nav-main";

// Mock the stores
vi.mock("@/stores/navigation-store");
vi.mock("@/stores/project-store");

describe("NavMain", () => {
	beforeEach(() => {
		// Mock navigation store with active project
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

		// Mock project store
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

	it("renders all main parts correctly", () => {
		render(
			<SidebarProvider>
				<NavMain data-testid="nav-main" />
			</SidebarProvider>,
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
