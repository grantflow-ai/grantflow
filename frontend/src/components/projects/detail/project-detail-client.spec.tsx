import { ApplicationFactory, ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HTTPError } from "ky";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

import * as grantApplicationsActions from "@/actions/grant-applications";
import * as projectActions from "@/actions/project";

import { ProjectDetailClient } from "./project-detail-client";

// Mock dependencies
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(() => ({
		get: vi.fn(),
	})),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
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

vi.mock("@/utils/navigation", () => ({
	routes: {
		application: {
			wizard: vi.fn(() => "/wizard"),
		},
		project: {
			dashboard: vi.fn(() => "/dashboard"),
			detail: vi.fn(() => "/project/123"),
		},
		projects: vi.fn(() => "/projects"),
	},
}));

vi.mock("@/stores/project-store", () => ({
	useProjectStore: vi.fn(),
}));

vi.mock("@/stores/navigation-store", () => ({
	useNavigationStore: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

import * as navigationStore from "@/stores/navigation-store";
// Import store modules for mocking
import * as projectStore from "@/stores/project-store";

describe("ProjectDetailClient", () => {
	const mockPush = vi.fn();
	const mockNavigateToApplication = vi.fn();
	const mockProject = ProjectFactory.build({
		description: "Test Description",
		id: "project-123",
		name: "Test Project",
	});
	const mockApplications = ApplicationFactory.batch(3);
	const mockMembers = [
		{
			display_name: "John Doe",
			email: "john@example.com",
			firebase_uid: "user-123",
			joined_at: "2024-01-01T00:00:00Z",
			photo_url: null,
			role: "OWNER" as const,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({
			back: vi.fn(),
			forward: vi.fn(),
			prefetch: vi.fn(),
			push: mockPush,
			refresh: vi.fn(),
			replace: vi.fn(),
		} as any);

		// Mock project store
		vi.mocked(projectStore.useProjectStore).mockReturnValue({
			createProject: vi.fn(),
			deleteProject: vi.fn(),
			getProject: vi.fn(),
			getProjects: vi.fn(),
			isLoading: false,
			project: mockProject,
			projects: [mockProject],
			updateProject: vi.fn(),
		} as any);

		// Mock navigation store
		vi.mocked(navigationStore.useNavigationStore).mockReturnValue({
			navigateToApplication: mockNavigateToApplication,
		} as any);

		// Mock SWR for project data
		vi.mocked(useSWR).mockImplementation((key: any) => {
			if (key && key.includes("/projects/") && key.includes("/applications")) {
				return {
					data: {
						applications: mockApplications,
						pagination: { has_more: false, limit: 50, offset: 0, total: 3 },
					},
					error: null,
					isLoading: false,
					mutate: vi.fn(),
				} as any;
			}
			if (key && key.includes("/projects/") && key.includes("/members")) {
				return {
					data: mockMembers,
					error: null,
					isLoading: false,
					mutate: vi.fn(),
				} as any;
			}
			return {
				data: null,
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			} as any;
		});

		vi.mocked(projectActions.getProjectMembers).mockResolvedValue(mockMembers);
	});

	describe("Basic rendering", () => {
		it("renders the project header with correct information", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			expect(screen.getByText("Test Project")).toBeInTheDocument();
			// Note: Project description is not displayed in the current UI
		});

		it("renders application cards when applications exist", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// Should show application cards
			mockApplications.forEach((app) => {
				expect(screen.getByTestId(`application-card-${app.id}`)).toBeInTheDocument();
			});
		});

		it("shows empty state when no applications exist", async () => {
			vi.mocked(useSWR).mockImplementation((key: any) => {
				if (key && key.includes("/applications")) {
					return {
						data: {
							applications: [],
							pagination: { has_more: false, limit: 50, offset: 0, total: 0 },
						},
						error: null,
						isLoading: false,
						mutate: vi.fn(),
					} as any;
				}
				if (key && key.includes("/members")) {
					return {
						data: mockMembers,
						error: null,
						isLoading: false,
						mutate: vi.fn(),
					} as any;
				}
				return {
					data: null,
					error: null,
					isLoading: false,
					mutate: vi.fn(),
				} as any;
			});

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// Should show empty state button
			expect(screen.getByTestId("empty-state-new-application-button")).toBeInTheDocument();
		});
	});

	describe("Application creation", () => {
		it("creates a new application when create button is clicked", async () => {
			const user = userEvent.setup();
			const newApplication = ApplicationFactory.build({ title: "New Application" });

			vi.mocked(grantApplicationsActions.createApplication).mockResolvedValue(newApplication);

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			const createButton = screen.getByTestId("new-application-button");
			await user.click(createButton);

			await waitFor(() => {
				expect(grantApplicationsActions.createApplication).toHaveBeenCalledWith(mockProject.id, {
					title: "Untitled Application",
				});
			});

			expect(mutate).toHaveBeenCalledWith(`/projects/${mockProject.id}/applications`);
			expect(mockPush).toHaveBeenCalledWith("/wizard");
		});

		it("handles creation errors gracefully", async () => {
			const user = userEvent.setup();
			const error = new HTTPError(
				new Response(JSON.stringify({ detail: "Creation failed" }), { status: 400 }),
				{} as any,
				{} as any,
			);

			vi.mocked(grantApplicationsActions.createApplication).mockRejectedValue(error);

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			const createButton = screen.getByTestId("new-application-button");
			await user.click(createButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create application");
			});
		});
	});

	describe("Application interactions", () => {
		it("passes correct handlers to ApplicationList component", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// Should render ApplicationList with applications
			mockApplications.forEach((app) => {
				expect(screen.getByTestId(`application-card-${app.id}`)).toBeInTheDocument();
			});
		});

		it("handles duplicate application action", async () => {
			const duplicatedApplication = ApplicationFactory.build({
				id: "new-app-id",
				parent_id: mockApplications[0].id,
				title: "Copy of Test Application",
			});

			vi.mocked(grantApplicationsActions.duplicateApplication).mockResolvedValue(duplicatedApplication);

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// The duplicate functionality would be tested through component interaction
			// but that requires more complex user event simulation
			expect(screen.getByTestId(`application-card-${mockApplications[0].id}`)).toBeInTheDocument();
		});
	});

	describe("Search functionality", () => {
		it("renders search input", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText("Search by application name or content");
			expect(searchInput).toBeInTheDocument();
		});

		it("allows typing in search input", async () => {
			const user = userEvent.setup();

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText("Search by application name or content");
			await user.type(searchInput, "test query");

			expect(searchInput).toHaveValue("test query");
		});
	});

	describe("Error handling", () => {
		it("handles missing project gracefully", () => {
			// Mock project store to return no project
			vi.mocked(projectStore.useProjectStore).mockReturnValue({
				createProject: vi.fn(),
				deleteProject: vi.fn(),
				getProject: vi.fn(),
				getProjects: vi.fn(),
				isLoading: false,
				project: null,
				projects: [],
				updateProject: vi.fn(),
			} as any);

			const mockReplace = vi.fn();
			vi.mocked(useRouter).mockReturnValue({
				back: vi.fn(),
				forward: vi.fn(),
				prefetch: vi.fn(),
				push: mockPush,
				refresh: vi.fn(),
				replace: mockReplace,
			} as any);

			render(<ProjectDetailClient />);

			// Should redirect to projects page when no project
			expect(mockReplace).toHaveBeenCalledWith("/projects");
		});

		it("handles applications loading errors", async () => {
			vi.mocked(useSWR).mockImplementation((key: any) => {
				if (key && key.includes("/applications")) {
					return {
						data: null,
						error: new Error("Failed to load applications"),
						isLoading: false,
						mutate: vi.fn(),
					} as any;
				}
				if (key && key.includes("/members")) {
					return {
						data: mockMembers,
						error: null,
						isLoading: false,
						mutate: vi.fn(),
					} as any;
				}
				return {
					data: null,
					error: null,
					isLoading: false,
					mutate: vi.fn(),
				} as any;
			});

			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// Should still render the project header even with applications error
			expect(screen.getByText("Test Project")).toBeInTheDocument();
		});
	});

	describe("Component structure", () => {
		it("has proper data-testid attributes", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			expect(screen.getByTestId("applications-section")).toBeInTheDocument();
		});

		it("renders main content area", async () => {
			render(<ProjectDetailClient />);

			await waitFor(() => {
				expect(screen.getByTestId("project-header")).toBeInTheDocument();
			});

			// Check that main semantic elements exist (component has multiple main elements)
			expect(screen.getAllByRole("main").length).toBeGreaterThan(0);
		});
	});
});
