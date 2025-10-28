import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationCardDataFactory, ProjectFactory, ProjectMemberFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDetailClient } from "./project-detail-client";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("swr", () => ({
	default: vi.fn(),
	mutate: vi.fn(),
}));
vi.mock("@/actions/grant-applications", () => ({
	deleteApplication: vi.fn(),
	duplicateApplication: vi.fn(),
	listApplications: vi.fn(),
}));
vi.mock("@/actions/project", () => ({
	getProjectMembers: vi.fn(),
}));
vi.mock("@/stores/navigation-store", () => ({
	useNavigationStore: vi.fn(),
}));
vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: vi.fn(),
}));
vi.mock("@/stores/project-store", () => ({
	useProjectStore: vi.fn(),
}));
vi.mock("@/stores/new-application-modal-store", () => ({
	useNewApplicationModalStore: vi.fn(),
}));
vi.mock("@/utils/logger", () => ({
	log: { error: vi.fn() },
}));
vi.mock("@/components/layout/app-header", () => ({
	default: vi.fn(() => <div data-testid="mock-app-header" />),
}));
vi.mock("@/components/app", () => ({
	AppButton: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
	AvatarGroup: vi.fn(() => <div data-testid="mock-avatar-group" />),
}));
vi.mock("./delete-application-modal", () => ({
	DeleteApplicationModal: vi.fn(() => <div data-testid="mock-delete-modal" />),
}));
vi.mock("./application-list", () => ({
	ApplicationList: vi.fn(() => <div data-testid="mock-application-list" />),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: mockPush,
	refresh: vi.fn(),
	replace: mockReplace,
};
const mockNavigateToApplication = vi.fn();
const mockNavigateToProject = vi.fn();
const mockCloseModal = vi.fn();
const mockMutate = vi.fn();

const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseSWR = vi.mocked(await import("swr").then((m) => m.default));
const mockUseNavigationStore = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseOrganizationStore = vi.mocked(
	await import("@/stores/organization-store").then((m) => m.useOrganizationStore),
);
const mockUseProjectStore = vi.mocked(await import("@/stores/project-store").then((m) => m.useProjectStore));
const mockUseNewApplicationModalStore = vi.mocked(
	await import("@/stores/new-application-modal-store").then((m) => m.useNewApplicationModalStore),
);
const mockGetProjectMembers = vi.mocked(await import("@/actions/project").then((m) => m.getProjectMembers));

const MockDeleteApplicationModal = vi.mocked(
	await import("./delete-application-modal").then((m) => m.DeleteApplicationModal),
);
const MockApplicationList = vi.mocked(await import("./application-list").then((m) => m.ApplicationList));

describe("ProjectDetailClient", () => {
	const mockProject = ProjectFactory.build({
		id: "project-123",
		name: "Test Project",
	});

	const mockApplications = ApplicationCardDataFactory.batch(3);
	const mockMembers = ProjectMemberFactory.batch(2);

	beforeEach(() => {
		vi.clearAllMocks();
		setupAuthenticatedTest();

		mockUseRouter.mockReturnValue(mockRouter);
		mockUseNavigationStore.mockReturnValue({
			clearActiveApplication: vi.fn(),
			navigateToApplication: mockNavigateToApplication,
			navigateToProject: mockNavigateToProject,
			stateHydrated: true,
		});
		mockUseOrganizationStore.mockReturnValue({ selectedOrganizationId: "org-123" });
		mockUseProjectStore.mockReturnValue({
			getProjects: vi.fn(),
			project: mockProject,
			projects: [],
		});
		mockUseNewApplicationModalStore.mockReturnValue({
			closeModal: mockCloseModal,
			isModalOpen: false,
		});

		mockUseSWR.mockImplementation((key) => {
			if (typeof key === "string" && key.includes("/applications")) {
				return {
					data: { applications: mockApplications },
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: mockMutate,
				};
			}
			if (typeof key === "string" && key.includes("/members")) {
				return {
					data: mockMembers,
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: vi.fn(),
				};
			}

			return {
				data: undefined,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			};
		});

		mockGetProjectMembers.mockResolvedValue(mockMembers);
	});

	it("should render project detail with basic structure", () => {
		render(<ProjectDetailClient />);

		expect(screen.getByTestId("mock-app-header")).toBeInTheDocument();
		expect(screen.getByTestId("project-header")).toBeInTheDocument();
		expect(screen.getByText("Test Project")).toBeInTheDocument();
		expect(screen.getByTestId("application-search-input")).toBeInTheDocument();
		expect(screen.getByTestId("new-application-button")).toBeInTheDocument();
		expect(screen.getByTestId("mock-application-list")).toBeInTheDocument();
	});

	it("should display loading indicator when no project is selected", () => {
		mockUseProjectStore.mockReturnValue({
			getProjects: vi.fn(),
			project: null,
			projects: [],
		});
		mockUseSWR.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});

		render(<ProjectDetailClient />);

		expect(screen.getByText("Loading project...")).toBeInTheDocument();
	});

	it("should navigate to grant type selection on create", async () => {
		const user = userEvent.setup();

		render(<ProjectDetailClient />);

		const createButton = screen.getByTestId("new-application-button");
		await user.click(createButton);

		expect(mockNavigateToProject).toHaveBeenCalledWith("project-123", "Test Project");
		expect(mockCloseModal).toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/new");
	});

	it("should enable title editing when edit icon is clicked", async () => {
		const user = userEvent.setup();

		render(<ProjectDetailClient />);

		const editButton = screen.getByRole("button", { name: "" });
		await user.click(editButton);

		expect(await screen.findByTestId("project-title-input")).toHaveTextContent("Test Project");
	});

	it("should filter applications based on search query", async () => {
		const user = userEvent.setup();

		render(<ProjectDetailClient />);

		const searchInput = screen.getByTestId("application-search-input");
		await user.type(searchInput, "test query");

		expect(MockApplicationList).toHaveBeenCalledWith(
			expect.objectContaining({
				searchQuery: "test query",
			}),
			undefined,
		);
	});

	it("should handle application deletion", async () => {
		render(<ProjectDetailClient />);

		expect(MockDeleteApplicationModal).toHaveBeenCalledWith(
			{
				isOpen: false,
				onClose: expect.any(Function),
				onConfirm: expect.any(Function),
			},
			undefined,
		);
	});

	it("should handle no organization selected scenario", () => {
		mockUseOrganizationStore.mockReturnValue({ selectedOrganizationId: null });

		render(<ProjectDetailClient />);

		const createButton = screen.getByTestId("new-application-button");
		expect(createButton).toBeInTheDocument();
	});

	it("should display loading state when applications are loading", () => {
		mockUseSWR.mockImplementation((key) => {
			if (typeof key === "string" && key.includes("/applications")) {
				return {
					data: undefined,
					error: undefined,
					isLoading: true,
					isValidating: false,
					mutate: mockMutate,
				};
			}
			if (typeof key === "string" && key.includes("/members")) {
				return {
					data: mockMembers,
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: vi.fn(),
				};
			}
			return {
				data: undefined,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			};
		});

		render(<ProjectDetailClient />);

		expect(MockApplicationList).toHaveBeenCalledWith(
			expect.objectContaining({
				applications: [],
				isLoading: true,
			}),
			undefined,
		);
	});
});
