import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ListOrganizationsResponseFactory, ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "./dashboard-client";

// Mock all dependencies
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));
vi.mock("swr", () => ({
	default: vi.fn(),
}));
vi.mock("@/actions/project", () => ({
	createProject: vi.fn(),
	getProjects: vi.fn(),
}));
vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));
vi.mock("@/hooks/use-organization", () => ({
	useOrganization: vi.fn(),
}));
vi.mock("@/stores/navigation-store", () => ({
	useNavigationStore: vi.fn(),
}));
vi.mock("@/stores/notification-store", () => ({
	useNotificationStore: vi.fn(),
}));
vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: vi.fn(),
}));
vi.mock("@/stores/project-store", () => ({
	useProjectStore: vi.fn(),
}));
vi.mock("@/stores/user-store", () => ({
	useUserStore: vi.fn(),
}));
vi.mock("@/utils/navigation");
vi.mock("@/components/layout/app-header", () => ({
	AppHeader: vi.fn(() => <div data-testid="mock-app-header" />),
}));
vi.mock("@/components/projects", () => ({
	DashboardProjectCard: vi.fn(() => <div data-testid="mock-project-card" />),
	DeleteProjectModal: vi.fn(() => <div data-testid="mock-delete-modal" />),
	InviteCollaboratorModal: vi.fn(() => <div data-testid="mock-invite-modal" />),
}));
vi.mock("@/components/app", () => ({
	AvatarGroup: vi.fn(() => <div data-testid="mock-avatar-group" />),
}));
vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: vi.fn(({ children }) => <div>{children}</div>),
	TooltipContent: vi.fn(() => <div />),
	TooltipTrigger: vi.fn(({ children }) => <div>{children}</div>),
}));
vi.mock("../payment/payment-link", () => ({
	default: vi.fn(() => <div data-testid="mock-payment-link" />),
}));
vi.mock("./dashboard-stats", () => ({
	DashboardStats: vi.fn(() => <div data-testid="mock-dashboard-stats" />),
}));
vi.mock("./welcome/welcome-modal", () => ({
	WelcomeModal: vi.fn(() => <div data-testid="mock-welcome-modal" />),
}));

const mockPush = vi.fn();
const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: mockPush,
	refresh: vi.fn(),
	replace: vi.fn(),
};
const mockNavigateToProject = vi.fn();
const mockSwitchOrganization = vi.fn();
const mockSetOrganizations = vi.fn();
const mockDeleteProject = vi.fn();
const mockDuplicateProject = vi.fn();
const mockAddNotification = vi.fn();
const mockMutate = vi.fn();

// Get mocked functions
const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseSWR = vi.mocked(await import("swr").then((m) => m.default));
const mockUseNavigation = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseOrganization = vi.mocked(await import("@/hooks/use-organization").then((m) => m.useOrganization));
const mockUseOrganizationStore = vi.mocked(
	await import("@/stores/organization-store").then((m) => m.useOrganizationStore),
);
const mockUseProjectStore = vi.mocked(await import("@/stores/project-store").then((m) => m.useProjectStore));
const mockUseNotificationStore = vi.mocked(
	await import("@/stores/notification-store").then((m) => m.useNotificationStore),
);
const mockUseUserStore = vi.mocked(await import("@/stores/user-store").then((m) => m.useUserStore));
const mockCreateProject = vi.mocked(await import("@/actions/project").then((m) => m.createProject));
// Get mocked components
const MockDashboardStats = vi.mocked(await import("./dashboard-stats").then((m) => m.DashboardStats));
const MockDashboardProjectCard = vi.mocked(await import("@/components/projects").then((m) => m.DashboardProjectCard));
const MockWelcomeModal = vi.mocked(await import("./welcome/welcome-modal").then((m) => m.WelcomeModal));
const MockInviteCollaboratorModal = vi.mocked(
	await import("@/components/projects").then((m) => m.InviteCollaboratorModal),
);
const MockPaymentLink = vi.mocked(await import("../payment/payment-link").then((m) => m.default));

describe("DashboardClient", () => {
	const defaultProps = {
		initialOrganizations: ListOrganizationsResponseFactory.build(),
		initialProjects: ProjectListItemFactory.batch(3),
		initialSelectedOrganizationId: "org-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		setupAuthenticatedTest();

		// Setup default mock returns
		mockUseRouter.mockReturnValue(mockRouter);
		mockUseNavigation.mockReturnValue({ navigateToProject: mockNavigateToProject });
		mockUseOrganization.mockReturnValue({
			clearOrganization: vi.fn(),
			selectedOrganizationId: "org-123",
			switchOrganization: mockSwitchOrganization,
		});
		mockUseOrganizationStore.mockReturnValue({ setOrganizations: mockSetOrganizations });
		mockUseProjectStore.mockReturnValue({
			deleteProject: mockDeleteProject,
			duplicateProject: mockDuplicateProject,
		});
		mockUseNotificationStore.mockReturnValue({ addNotification: mockAddNotification });
		mockUseUserStore.mockReturnValue({
			user: { displayName: "Test User", email: "test@example.com" },
		});
		mockUseSWR.mockReturnValue({
			data: defaultProps.initialProjects,
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});
	});

	it("should render dashboard with basic structure", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(screen.getByTestId("mock-app-header")).toBeInTheDocument();
		expect(screen.getByTestId("dashboard-main-content")).toBeInTheDocument();
		expect(screen.getByTestId("dashboard-title")).toHaveTextContent("Dashboard");
		expect(screen.getByTestId("research-projects-heading")).toHaveTextContent("Research Projects");
		expect(screen.getByTestId("projects-container")).toBeInTheDocument();
	});

	it("should render welcome modal for single project with no applications", () => {
		const singleProject = ProjectListItemFactory.build({ applications_count: 0 });

		// Mock SWR to return the single project for this test
		mockUseSWR.mockReturnValue({
			data: [singleProject],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		render(<DashboardClient {...defaultProps} initialProjects={[singleProject]} />);

		expect(MockWelcomeModal).toHaveBeenCalledWith(
			{
				onStartApplication: expect.any(Function),
			},
			undefined,
		);
	});

	it("should not render welcome modal for multiple projects", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(MockWelcomeModal).not.toHaveBeenCalled();
	});

	it("should render projects when available", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(MockDashboardProjectCard).toHaveBeenCalledTimes(3);
		expect(screen.queryByTestId("empty-projects-state")).not.toBeInTheDocument();
	});

	it("should render empty state when no projects", () => {
		// Mock SWR to return empty projects for this test
		mockUseSWR.mockReturnValue({
			data: [],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		render(<DashboardClient {...defaultProps} initialProjects={[]} />);

		expect(screen.getByTestId("empty-projects-state")).toBeInTheDocument();
		expect(screen.getByTestId("create-first-project-button")).toBeInTheDocument();
		expect(MockDashboardProjectCard).not.toHaveBeenCalled();
	});

	it("should handle creating new project", async () => {
		const user = userEvent.setup();
		mockCreateProject.mockResolvedValue({ id: "new-project-123" });

		render(<DashboardClient {...defaultProps} />);

		const createButton = screen.getByTestId("new-research-project-button");
		await user.click(createButton);

		expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
			description: "",
			name: "New Project 4",
		});
	});

	it("should show creating state when creating project", async () => {
		const user = userEvent.setup();
		mockCreateProject.mockImplementation(() => new Promise(() => {})); // Never resolves

		render(<DashboardClient {...defaultProps} />);

		const createButton = screen.getByTestId("new-research-project-button");
		await user.click(createButton);

		expect(createButton).toHaveTextContent("Creating...");
		expect(createButton).toBeDisabled();
	});

	it("should handle invite collaborators button click", async () => {
		const user = userEvent.setup();

		render(<DashboardClient {...defaultProps} />);

		const inviteButton = screen.getByTestId("invite-collaborators-button");
		await user.click(inviteButton);

		// Check that modal was called with isOpen: true (should be the second call after initial render)
		expect(MockInviteCollaboratorModal).toHaveBeenCalledWith(
			{
				isOpen: true,
				onClose: expect.any(Function),
				onInvite: expect.any(Function),
			},
			undefined,
		);
	});

	it("should initialize organization store with server data", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(mockSetOrganizations).toHaveBeenCalledWith(defaultProps.initialOrganizations);
	});

	it("should switch organization when none selected but initial provided", () => {
		mockUseOrganization.mockReturnValue({
			clearOrganization: vi.fn(),
			selectedOrganizationId: null,
			switchOrganization: mockSwitchOrganization,
		});

		render(<DashboardClient {...defaultProps} />);

		expect(mockSwitchOrganization).toHaveBeenCalledWith("org-123");
	});

	it("should handle create project from empty state", async () => {
		const user = userEvent.setup();
		mockCreateProject.mockResolvedValue({ id: "new-project-123" });

		// Mock SWR to return empty projects for this test
		mockUseSWR.mockReturnValue({
			data: [],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		render(<DashboardClient {...defaultProps} initialProjects={[]} />);

		const createButton = screen.getByTestId("create-first-project-button");
		await user.click(createButton);

		expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
			description: "",
			name: "New Project 1",
		});
	});

	it("should render dashboard stats component", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(MockDashboardStats).toHaveBeenCalledWith({ initialProjects: defaultProps.initialProjects }, undefined);
	});

	it("should render payment link component", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(MockPaymentLink).toHaveBeenCalled();
	});

	it("should handle no organization selected scenario", () => {
		mockUseOrganization.mockReturnValue({
			clearOrganization: vi.fn(),
			selectedOrganizationId: null,
			switchOrganization: mockSwitchOrganization,
		});

		render(<DashboardClient {...defaultProps} initialSelectedOrganizationId={null} />);

		// Should still render but with limited functionality
		expect(screen.getByTestId("dashboard-title")).toBeInTheDocument();
	});
});
