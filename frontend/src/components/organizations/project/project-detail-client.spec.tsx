import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationCardDataFactory,
	ApplicationFactory,
	ProjectFactory,
	ProjectMemberFactory,
} from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
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
	createApplication: vi.fn(),
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
vi.mock("@/utils/logger", () => ({
	log: { error: vi.fn() },
}));
vi.mock("@/components/layout/app-header", () => ({
	AppHeader: vi.fn(() => <div data-testid="mock-app-header" />),
}));
vi.mock("@/components/app", () => ({
	AppButton: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
	AvatarGroup: vi.fn(({ users, ...props }) => (
		<div data-testid="avatar-group" {...props}>
			{users?.length ?? 0} users
		</div>
	)),
}));
vi.mock("./applications/delete-application-modal", () => ({
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
const mockMutate = vi.fn();

const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockUseSWR = vi.mocked(await import("swr").then((m) => m.default));
const mockUseNavigationStore = vi.mocked(await import("@/stores/navigation-store").then((m) => m.useNavigationStore));
const mockUseOrganizationStore = vi.mocked(
	await import("@/stores/organization-store").then((m) => m.useOrganizationStore),
);
const mockUseProjectStore = vi.mocked(await import("@/stores/project-store").then((m) => m.useProjectStore));
const mockCreateApplication = vi.mocked(await import("@/actions/grant-applications").then((m) => m.createApplication));
const mockGetProjectMembers = vi.mocked(await import("@/actions/project").then((m) => m.getProjectMembers));

const MockDeleteApplicationModal = vi.mocked(
	await import("./applications/delete-application-modal").then((m) => m.DeleteApplicationModal),
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
		mockUseNavigationStore.mockReturnValue({ navigateToApplication: mockNavigateToApplication });
		mockUseOrganizationStore.mockReturnValue({ selectedOrganizationId: "org-123" });
		mockUseProjectStore.mockReturnValue({ project: mockProject });

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

	it("should redirect to projects page when no project", () => {
		mockUseProjectStore.mockReturnValue({ project: null });
		mockUseSWR
			.mockReturnValueOnce({
				data: undefined,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: mockMutate,
			})
			.mockReturnValueOnce({
				data: undefined,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			});

		render(<ProjectDetailClient />);

		expect(mockReplace).toHaveBeenCalledWith("/organization");
	});

	it("should handle creating new application", async () => {
		const user = userEvent.setup();
		const newApplication = ApplicationFactory.build({ id: "app-new" });
		mockCreateApplication.mockResolvedValue(newApplication);

		mockUseSWR
			.mockReturnValueOnce({
				data: { applications: mockApplications },
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: mockMutate,
			})
			.mockReturnValueOnce({
				data: mockMembers,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			});

		render(<ProjectDetailClient />);

		const createButton = screen.getByTestId("new-application-button");
		await user.click(createButton);

		expect(mockCreateApplication).toHaveBeenCalledWith("org-123", "project-123", {
			title: "Untitled Application",
		});
		expect(mockNavigateToApplication).toHaveBeenCalledWith(
			"project-123",
			"Test Project",
			"app-new",
			expect.any(String),
		);
		expect(mockPush).toHaveBeenCalledWith("/organization/project/application/wizard");
	});

	it("should show creating state when creating application", async () => {
		const user = userEvent.setup();
		let resolvePromise: (value: any) => void;
		mockCreateApplication.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
		);

		render(<ProjectDetailClient />);

		const createButton = screen.getByTestId("new-application-button");

		const clickPromise = user.click(createButton);

		await clickPromise;

		expect(createButton).toHaveTextContent("New Application");
		expect(createButton).toBeDisabled();

		const newApplication = ApplicationFactory.build({ id: "app-new" });
		resolvePromise!(newApplication);
	});

	it("should handle application creation errors", async () => {
		const user = userEvent.setup();
		const error = new Error("Creation failed");
		mockCreateApplication.mockRejectedValue(error);

		render(<ProjectDetailClient />);

		const createButton = screen.getByTestId("new-application-button");
		await user.click(createButton);

		expect(toast.error).toHaveBeenCalledWith("Failed to create application");
		expect(createButton).toHaveTextContent("New Application");
		expect(createButton).not.toBeDisabled();
	});

	it("should enable title editing when edit icon is clicked", async () => {
		const user = userEvent.setup();

		render(<ProjectDetailClient />);

		const editButton = screen.getByRole("button", { name: "" });
		await user.click(editButton);

		expect(screen.getByRole("textbox", { name: "Project Title" })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Project Title" })).toHaveTextContent("Test Project");
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
		mockUseSWR
			.mockReturnValueOnce({
				data: undefined,
				error: undefined,
				isLoading: true,
				isValidating: false,
				mutate: mockMutate,
			})
			.mockReturnValueOnce({
				data: mockMembers,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
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
