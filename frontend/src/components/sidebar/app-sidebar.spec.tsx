import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("next/navigation", () => ({
	// usePathname: vi.fn(() => "/"),
	useRouter: vi.fn(),
	// useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/stores/navigation-store", () => ({
	useNavigationStore: vi.fn(),
}));
vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: vi.fn(),
}));
vi.mock("@/stores/new-application-modal-store", () => ({
	useNewApplicationModalStore: vi.fn(),
}));
vi.mock("@/components/organizations/modals/new-application-modal", () => ({
	default: vi.fn(() => <div data-testid="mock-new-application-modal" />),
}));
vi.mock("@/actions/project", () => ({
	createProject: vi.fn(),
	getProjects: vi.fn(),
}));
vi.mock("swr", () => ({
	default: vi.fn(),
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

import { AppSidebar } from "./app-sidebar";

const MockNewApplicationModal = vi.mocked(
	await import("@/components/organizations/modals/new-application-modal").then((m) => m.default),
);
const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseNavigation = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseOrganizationStore = vi.mocked(
	await import("@/stores/organization-store").then((m) => m.useOrganizationStore),
);
const mockUseNewApplicationModalStore = vi.mocked(
	await import("@/stores/new-application-modal-store").then((m) => m.useNewApplicationModalStore),
);
const mockUseSWR = vi.mocked(await import("swr").then((m) => m.default));
const mockCreateProject = vi.mocked(await import("@/actions/project").then((m) => m.createProject));

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
const mockCloseModal = vi.fn();
const mockMutate = vi.fn();

const mockOrganization = { id: "org-123", name: "Test Org" };
const mockProjects = [{ id: "project-123", name: "Test Project" }];

describe.sequential("AppSidebar", () => {
	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseRouter.mockReturnValue(mockRouter);
		mockUseNavigation.mockReturnValue({
			clearActiveProject: vi.fn(),
			navigateToProject: mockNavigateToProject,
			stateHydrated: true,
		});

		mockUseOrganizationStore.mockReturnValue({ organization: mockOrganization });
	});
	mockUseNewApplicationModalStore.mockReturnValue({
		closeModal: mockCloseModal,
		isModalOpen: false,
		openModal: vi.fn(),
	});

	mockUseSWR.mockReturnValue({
		data: mockProjects,
		error: undefined,
		isLoading: false,
		isValidating: false,
		mutate: mockMutate,
	});

	function renderWithProvider(props = {}) {
		const { container } = render(
			<SidebarProvider>
				<AppSidebar {...props} />
			</SidebarProvider>,
		);
		return { container };
	}

	it("renders logo", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="sidebar-logo"]')).toBeInTheDocument();
	});

	it("renders New Application button", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="new-application-button"]')).toBeInTheDocument();
	});

	it("renders Support and Logout buttons", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="support-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).toBeInTheDocument();
	});

	it("renders CustomSidebarTrigger and NavMain", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).toBeInTheDocument();
	});

	it("renders nothing when hidden prop is true", () => {
		const { container } = renderWithProvider({ hidden: true });
		expect(container.querySelector('[data-testid="sidebar-logo"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="new-application-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="support-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).not.toBeInTheDocument();
	});

	it("renders normally when hidden prop is false", () => {
		const { container } = renderWithProvider({ hidden: false });
		expect(container.querySelector('[data-testid="sidebar-logo"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="new-application-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="support-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).toBeInTheDocument();
	});

	it("should handle application creation with existing project", async () => {
		const navigateToProject = vi.fn();

		mockUseNavigation.mockReturnValue({
			clearActiveProject: vi.fn(),
			navigateToProject,
			stateHydrated: true,
		});

		mockUseRouter.mockReturnValue(mockRouter);

		mockUseSWR.mockReturnValue({
			data: [],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		mockUseNewApplicationModalStore.mockReturnValue({
			closeModal: mockCloseModal,
			isModalOpen: true,
			openModal: vi.fn(),
		});

		mockCreateProject.mockResolvedValueOnce({
			id: "project-456",
		});

		renderWithProvider();

		const createFunction = MockNewApplicationModal.mock.calls[0][0].onCreate;
		await createFunction("project-456", "New Test Project", true);

		expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
			description: "",
			name: "New Test Project",
		});
		expect(navigateToProject).toHaveBeenCalledWith("project-456", "New Test Project");
		expect(mockCloseModal).toHaveBeenCalled();
		expect(mockRouter.push).toHaveBeenCalledWith("/organization/project/application/new");
		expect(mockMutate).toHaveBeenCalled();
	});

	it("should handle application creation with new project", async () => {
		const navigateToProject = vi.fn();
		// const push = vi.fn();
		// const mutateSpy = vi.fn();

		mockUseNavigation.mockReturnValue({
			clearActiveProject: vi.fn(),
			navigateToProject,
			stateHydrated: true,
		});

		mockUseRouter.mockReturnValue(mockRouter);

		mockCreateProject.mockResolvedValueOnce({
			id: "project-456",
		});

		mockUseNewApplicationModalStore.mockReturnValue({
			closeModal: mockCloseModal,
			isModalOpen: true,
		});

		mockUseSWR.mockReturnValue({
			data: mockProjects,
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: mockMutate,
		});

		renderWithProvider();

		const createFunction = MockNewApplicationModal.mock.calls[0][0].onCreate;
		await createFunction(null, "New Test Project", true);

		expect(mockCreateProject).toHaveBeenCalledWith("org-123", {
			description: "",
			name: "New Test Project",
		});
		expect(navigateToProject).toHaveBeenCalledWith("project-456", "New Test Project");
		expect(mockCloseModal).toHaveBeenCalled();
		expect(mockRouter.push).toHaveBeenCalledWith("/organization/project/application/new");
		expect(mockMutate).toHaveBeenCalled();
	});
});
