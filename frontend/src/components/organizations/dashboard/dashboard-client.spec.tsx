import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ListOrganizationsResponseFactory, ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "./dashboard-client";

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
vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
}));
vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));
vi.mock("@/hooks/use-organization-validation", () => ({
	useOrganizationValidation: vi.fn(),
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
vi.mock("@/stores/new-application-modal-store", () => ({
	useNewApplicationModalStore: vi.fn(),
}));
vi.mock("@/utils/navigation", () => ({
	routes: {
		organization: {
			project: {
				application: {
					wizard: vi.fn(() => "/organization/project/application/wizard"),
				},
			},
		},
	},
}));
vi.mock("@/constants", () => ({
	DEFAULT_APPLICATION_TITLE: "Untitled Application",
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));
vi.mock("@/components/layout/app-header", () => ({
	default: vi.fn(() => <div data-testid="mock-app-header" />),
}));
vi.mock("./dashboard-project-card", () => ({
	DashboardProjectCard: vi.fn(() => <div data-testid="mock-project-card" />),
}));
vi.mock("@/components/organizations/modals/delete-project-modal", () => ({
	DeleteProjectModal: vi.fn(() => <div data-testid="mock-delete-modal" />),
}));
vi.mock("@/components/organizations/modals/new-application-modal", () => ({
	default: vi.fn(() => <div data-testid="mock-new-application-modal" />),
}));
vi.mock("@/components/app", () => ({
	AppButton: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
	AvatarGroup: vi.fn(() => <div data-testid="mock-avatar-group" />),
}));
vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: vi.fn(({ children }) => <div>{children}</div>),
	TooltipContent: vi.fn(() => <div />),
	TooltipTrigger: vi.fn(({ children }) => <div>{children}</div>),
}));
vi.mock("@/components/organizations/payment/payment-link", () => ({
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
const mockSetOrganizations = vi.fn();
const mockGetOrganization = vi.fn();
const mockDeleteProject = vi.fn();
const mockDuplicateProject = vi.fn();
const mockAddNotification = vi.fn();
const mockMutate = vi.fn();

const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseSWR = vi.mocked(await import("swr").then((m) => m.default));
const mockUseNavigation = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseOrganizationValidation = vi.mocked(
	await import("@/hooks/use-organization-validation").then((m) => m.useOrganizationValidation),
);
const mockUseOrganizationStore = vi.mocked(
	await import("@/stores/organization-store").then((m) => m.useOrganizationStore),
);
const mockUseProjectStore = vi.mocked(await import("@/stores/project-store").then((m) => m.useProjectStore));
const mockUseNotificationStore = vi.mocked(
	await import("@/stores/notification-store").then((m) => m.useNotificationStore),
);
const mockUseUserStore = vi.mocked(await import("@/stores/user-store").then((m) => m.useUserStore));
const mockUseNewApplicationModalStore = vi.mocked(
	await import("@/stores/new-application-modal-store").then((m) => m.useNewApplicationModalStore),
);
const mockCreateProject = vi.mocked(await import("@/actions/project").then((m) => m.createProject));
const mockCreateApplication = vi.mocked(await import("@/actions/grant-applications").then((m) => m.createApplication));

const MockDashboardStats = vi.mocked(await import("./dashboard-stats").then((m) => m.DashboardStats));
const MockDashboardProjectCard = vi.mocked(
	await import("./dashboard-project-card").then((m) => m.DashboardProjectCard),
);
const MockWelcomeModal = vi.mocked(await import("./welcome/welcome-modal").then((m) => m.WelcomeModal));
const MockPaymentLink = vi.mocked(
	await import("@/components/organizations/payment/payment-link").then((m) => m.default),
);
const MockNewApplicationModal = vi.mocked(
	await import("@/components/organizations/modals/new-application-modal").then((m) => m.default),
);
const MockDeleteProjectModal = vi.mocked(
	await import("@/components/organizations/modals/delete-project-modal").then((m) => m.DeleteProjectModal),
);

describe("DashboardClient", () => {
	const defaultProps = {
		initialOrganizations: ListOrganizationsResponseFactory.build(),
		initialProjects: ProjectListItemFactory.batch(3),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		setupAuthenticatedTest();

		mockUseRouter.mockReturnValue(mockRouter);
		mockUseNavigation.mockReturnValue({ navigateToProject: mockNavigateToProject });
		mockUseOrganizationValidation.mockReturnValue("org-123");
		mockUseOrganizationStore.mockReturnValue({
			getOrganization: mockGetOrganization,
			selectOrganization: vi.fn(),
			setOrganizations: mockSetOrganizations,
		});
		mockUseProjectStore.mockReturnValue({
			deleteProject: mockDeleteProject,
			duplicateProject: mockDuplicateProject,
		});
		mockUseNotificationStore.mockReturnValue({ addNotification: mockAddNotification });
		mockUseUserStore.mockReturnValue({
			user: { displayName: "Test User", email: "test@example.com" },
		});
		mockUseNewApplicationModalStore.mockReturnValue({
			closeModal: vi.fn(),
			isModalOpen: false,
			openModal: vi.fn(),
		});
		mockUseSWR.mockReturnValue({
			data: defaultProps.initialProjects,
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});
		mockCreateProject.mockResolvedValue(
			ProjectListItemFactory.build({ id: "new-project-id", name: "New Project 1" }),
		);
		mockCreateApplication.mockResolvedValue({
			created_at: "2023-01-01T00:00:00Z",
			editor_document_id: null,
			editor_document_init: false,
			id: "app-123",
			project_id: "project-123",
			rag_sources: [],
			status: "WORKING_DRAFT",
			title: "Untitled Application",
			updated_at: "2023-01-01T00:00:00Z",
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
		mockCreateProject.mockImplementation(() => new Promise(() => {}));

		render(<DashboardClient {...defaultProps} />);

		const createButton = screen.getByTestId("new-research-project-button");
		await user.click(createButton);

		expect(createButton).toHaveTextContent("Creating...");
		expect(createButton).toBeDisabled();
	});

	it("should initialize organization validation with server data", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(mockUseOrganizationValidation).toHaveBeenCalledWith(defaultProps.initialOrganizations);
	});

	it("should handle organization validation", () => {
		mockUseOrganizationValidation.mockReturnValue(null);

		render(<DashboardClient {...defaultProps} />);

		expect(mockUseOrganizationValidation).toHaveBeenCalledWith(defaultProps.initialOrganizations);
	});

	it("should handle create project from empty state", async () => {
		const user = userEvent.setup();
		mockCreateProject.mockResolvedValue({ id: "new-project-123" });

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
		mockUseOrganizationValidation.mockReturnValue(null);

		render(<DashboardClient {...defaultProps} />);

		expect(screen.getByTestId("dashboard-title")).toBeInTheDocument();
	});

	it("should render new application modal when open", () => {
		mockUseNewApplicationModalStore.mockReturnValue({
			closeModal: vi.fn(),
			isModalOpen: true,
			openModal: vi.fn(),
		});

		render(<DashboardClient {...defaultProps} />);

		expect(MockNewApplicationModal).toHaveBeenCalledWith(
			{
				isOpen: true,
				onClose: expect.any(Function),
				onCreate: expect.any(Function),
				projects: defaultProps.initialProjects,
			},
			undefined,
		);
	});

	it("should render delete project modal", () => {
		render(<DashboardClient {...defaultProps} />);

		expect(MockDeleteProjectModal).toHaveBeenCalledWith(
			{
				isOpen: false,
				onClose: expect.any(Function),
				onConfirm: expect.any(Function),
			},
			undefined,
		);
	});

	it("should handle project creation errors", async () => {
		const user = userEvent.setup();
		mockCreateProject.mockRejectedValue(new Error("Creation failed"));

		render(<DashboardClient {...defaultProps} />);

		const createButton = screen.getByTestId("new-research-project-button");
		await user.click(createButton);

		expect(mockCreateProject).toHaveBeenCalled();
		expect(mockAddNotification).toHaveBeenCalledWith({
			message: "Failed to create project. Please try again.",
			projectName: "",
			title: "Error creating project",
			type: "warning",
		});
	});

	it("should handle application creation with existing project", async () => {
		const mockNavigateToApplication = vi.fn();
		const mockPush = vi.fn();

		mockUseNavigation.mockReturnValue({
			navigateToApplication: mockNavigateToApplication,
			navigateToProject: vi.fn(),
		});

		mockUseRouter.mockReturnValue({
			back: vi.fn(),
			forward: vi.fn(),
			prefetch: vi.fn(),
			push: mockPush,
			refresh: vi.fn(),
			replace: vi.fn(),
		});

		render(<DashboardClient {...defaultProps} />);

		const createFunction = MockNewApplicationModal.mock.calls[0][0].onCreate;
		await createFunction("project-123", "Test Project", false);

		expect(mockCreateApplication).toHaveBeenCalledWith("org-123", "project-123", {
			title: "Untitled Application",
		});
		expect(mockNavigateToApplication).toHaveBeenCalledWith(
			"project-123",
			"Test Project",
			"app-123",
			"Untitled Application",
		);
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/wizard");
	});

	it("should handle application creation with new project", async () => {
		const mockNavigateToApplication = vi.fn();
		const mockPush = vi.fn();
		const mockMutate = vi.fn();

		mockUseNavigation.mockReturnValue({
			navigateToApplication: mockNavigateToApplication,
			navigateToProject: vi.fn(),
		});

		mockUseRouter.mockReturnValue({
			back: vi.fn(),
			forward: vi.fn(),
			prefetch: vi.fn(),
			push: mockPush,
			refresh: vi.fn(),
			replace: vi.fn(),
		});

		mockUseSWR.mockReturnValue({
			data: defaultProps.initialProjects,
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		mockCreateProject.mockResolvedValueOnce({
			id: "project-456",
		});

		mockCreateApplication.mockResolvedValueOnce({
			created_at: "2023-01-01T00:00:00Z",
			editor_document_id: null,
			editor_document_init: false,
			id: "app-456",
			project_id: "project-456",
			rag_sources: [],
			status: "WORKING_DRAFT",
			title: "Untitled Application",
			updated_at: "2023-01-01T00:00:00Z",
		});

		render(<DashboardClient {...defaultProps} />);

		const createFunction = MockNewApplicationModal.mock.calls[0][0].onCreate;
		await createFunction(null, "New Test Project", true);

		expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
			description: "",
			name: "New Test Project",
		});
		expect(mockCreateApplication).toHaveBeenCalledWith("org-123", "project-456", {
			title: "Untitled Application",
		});
		expect(mockNavigateToApplication).toHaveBeenCalledWith(
			"project-456",
			"New Test Project",
			"app-456",
			"Untitled Application",
		);
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/wizard");
		expect(mockMutate).toHaveBeenCalled();
	});
});
