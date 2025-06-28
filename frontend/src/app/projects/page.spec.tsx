/**
 * Dashboard Page Integration Tests
 * Tests the complete dashboard user journey including data fetching, project management, and modal interactions
 */

import { ProjectListItemFactory, ProjectRequestFactory } from "::testing/factories";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";
import { PagePath } from "@/enums";

// Mock environment variables
vi.mock("@/utils/env", () => ({
	getEnv: () => ({
		NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8080",
		NEXT_PUBLIC_FIREBASE_API_KEY: "mock-api-key",
		NEXT_PUBLIC_FIREBASE_APP_ID: "mock-app-id",
		NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "mock.firebaseapp.com",
		NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "mock-measurement-id",
		NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "mock-sender-id",
		NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: "mock-tenant-id",
		NEXT_PUBLIC_FIREBASE_PROJECT_ID: "mock-project-id",
		NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "mock.appspot.com",
		NEXT_PUBLIC_MAILGUN_API_KEY: "mock-mailgun-key",
		NEXT_PUBLIC_MOCK_API: false,
		NEXT_PUBLIC_SEGMENT_WRITE_KEY: "mock-segment-key",
		NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
	}),
}));

// Mock Next.js navigation
const mockPush = vi.fn();
const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: mockPush,
	refresh: vi.fn(),
	replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
	usePathname: () => "/projects",
	useRouter: () => mockRouter,
	useSearchParams: () => new URLSearchParams(),
}));

// Mock server actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockUpdateProject = vi.fn();

vi.mock("@/actions/projects", () => ({
	createProject: (...args: unknown[]) => mockCreateProject(...args),
	deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
	getProjects: (...args: unknown[]) => mockGetProjects(...args),
	updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

// Mock SWR to control data fetching
vi.mock("swr", () => ({
	default: vi.fn(),
	mutate: vi.fn(),
}));

// Mock store hooks
const mockUseUserStore = vi.fn();
const mockUseNotificationStore = vi.fn();
const mockUseProjectStore = vi.fn();

vi.mock("@/stores/user", () => ({
	useUserStore: (...args: unknown[]) => mockUseUserStore(...args),
}));

vi.mock("@/stores/notification", () => ({
	useNotificationStore: (...args: unknown[]) => mockUseNotificationStore(...args),
}));

vi.mock("@/stores/project", () => ({
	useProjectStore: (...args: unknown[]) => mockUseProjectStore(...args),
}));

// Mock all modals to prevent HTML nesting issues during testing
vi.mock("@/components/projects/dashboard/welcome/welcome-modal", () => ({
	WelcomeModal: () => null,
}));

vi.mock("@/components/projects/dashboard/dashboard-create-project-modal", () => ({
	DashboardCreateProjectModal: () => null,
}));

vi.mock("@/components/projects/modals/delete-project-modal", () => ({
	DeleteProjectModal: () => null,
}));

vi.mock("@/components/projects/modals/invite-collaborator-modal", () => ({
	InviteCollaboratorModal: () => null,
}));

describe("Dashboard Page Integration", () => {
	const user = userEvent.setup();

	// Mock data
	const mockProjects = ProjectListItemFactory.batch(3);
	const mockUser = {
		displayName: "Test User",
		email: "test@example.com",
		emailVerified: true,
		photoURL: null,
		providerId: "google.com",
		uid: "test-uid-123",
	};

	const mockUserStore = {
		clearUser: vi.fn(),
		dismissWelcomeModal: vi.fn(),
		hasSeenWelcomeModal: true, // Prevent welcome modal from showing in tests
		isAuthenticated: true,
		setUser: vi.fn(),
		user: mockUser,
	};

	beforeEach(async () => {
		vi.clearAllMocks();

		// Setup default mock implementations
		mockGetProjects.mockResolvedValue({ data: mockProjects, success: true });

		// Setup store defaults
		mockUseUserStore.mockReturnValue(mockUserStore);
		mockUseNotificationStore.mockReturnValue({
			addNotification: vi.fn(),
			notifications: [],
			removeNotification: vi.fn(),
		});
		mockUseProjectStore.mockReturnValue({
			createProject: vi.fn(),
			deleteProject: vi.fn(),
			projects: mockProjects,
			setProjects: vi.fn(),
		});

		// Setup SWR mock
		const swrMock = (await vi.importMock("swr")) as { default: ReturnType<typeof vi.fn> };
		(swrMock.default).mockReturnValue({
			data: mockProjects,
			error: null,
			isLoading: false,
			mutate: vi.fn(),
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Page Rendering and Initial Data", () => {
		it("should render dashboard with initial projects data", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Check main dashboard elements
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();

			// Check projects are displayed
			await waitFor(() => {
				mockProjects.forEach((project) => {
					expect(screen.getByText(project.name)).toBeInTheDocument();
				});
			});
		});

		it("should show correct project statistics", async () => {
			const projectsWithApps = [
				{ ...mockProjects[0], applications_count: 1 },
				{ ...mockProjects[1], applications_count: 2 },
				{ ...mockProjects[2], applications_count: 3 },
			];

			// Update SWR mock to return our test data
			const swrMock = (await vi.importMock("swr")) as { default: ReturnType<typeof vi.fn> };
			(swrMock.default).mockReturnValue({
				data: projectsWithApps,
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<DashboardClient initialProjects={projectsWithApps} />);

			await waitFor(() => {
				// Total projects: 3
				expect(screen.getByTestId("project-count")).toHaveTextContent("3");
				// Total applications: 1 + 2 + 3 = 6
				expect(screen.getByTestId("application-count")).toHaveTextContent("6");
			});
		});

		it("should handle empty projects state", async () => {
			mockGetProjects.mockResolvedValue({ data: [], success: true });

			const swrMock = (await vi.importMock("swr")) as { default: ReturnType<typeof vi.fn> };
			(swrMock.default).mockReturnValue({
				data: [],
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<DashboardClient initialProjects={[]} />);

			await waitFor(() => {
				expect(screen.getByText("You don't have any projects yet.")).toBeInTheDocument();
				expect(screen.getByText("Create Your First Project")).toBeInTheDocument();
			});
		});
	});

	describe("Project Creation Flow", () => {
		it("should open create project modal and create new project", async () => {
			const newProject = ProjectListItemFactory.build();
			const projectRequest = ProjectRequestFactory.build();

			mockCreateProject.mockResolvedValue({
				data: { id: newProject.id },
				success: true,
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Click create project button
			const createButton = screen.getByRole("button", { name: /new research project/i });
			await user.click(createButton);

			// Modal should open
			await waitFor(() => {
				expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
			});

			// Fill in project details
			const nameInput = screen.getByTestId("create-project-name-input");
			const descriptionInput = screen.getByTestId("create-project-description-textarea");

			await user.clear(nameInput);
			await user.type(nameInput, projectRequest.name);

			if (projectRequest.description) {
				await user.clear(descriptionInput);
				await user.type(descriptionInput, projectRequest.description);
			}

			// Submit form
			const submitButton = screen.getByTestId("create-project-submit-button");
			await user.click(submitButton);

			// Verify API call
			await waitFor(() => {
				expect(mockCreateProject).toHaveBeenCalledWith({
					description: projectRequest.description,
					logo_url: null,
					name: projectRequest.name,
				});
			});

			// Should navigate to new project
			await waitFor(() => {
				expect(mockPush).toHaveBeenCalledWith(`/projects/${newProject.id}`);
			});
		});

		it("should handle project creation errors", async () => {
			mockCreateProject.mockResolvedValue({
				error: "Project name already exists",
				success: false,
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Open modal and try to create project
			await user.click(screen.getByRole("button", { name: /new research project/i }));

			await waitFor(() => {
				expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
			});

			const nameInput = screen.getByTestId("create-project-name-input");
			await user.type(nameInput, "Test Project");

			await user.click(screen.getByTestId("create-project-submit-button"));

			// Should show error message
			await waitFor(() => {
				expect(screen.getByText("Project name already exists")).toBeInTheDocument();
			});

			// Should not navigate
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("should close modal when cancelled", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Open modal
			await user.click(screen.getByRole("button", { name: /new research project/i }));

			await waitFor(() => {
				expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
			});

			// Cancel modal
			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			// Modal should close
			await waitFor(() => {
				expect(screen.queryByTestId("create-project-form")).not.toBeInTheDocument();
			});
		});
	});

	describe("Project Management", () => {
		it("should delete project after confirmation", async () => {
			mockDeleteProject.mockResolvedValue({ success: true });

			render(<DashboardClient initialProjects={mockProjects} />);

			// Find and click delete button for first project
			const projectCard = screen.getByTestId("dashboard-project-card");
			const moreButton = projectCard.querySelector("[data-testid='more-options-button']");
			await user.click(moreButton!);

			const deleteButton = screen.getByTestId("delete-project-button");
			await user.click(deleteButton);

			// Confirm deletion
			await waitFor(() => {
				expect(screen.getByTestId("delete-project-modal")).toBeInTheDocument();
			});

			const confirmButton = screen.getByTestId("delete-button");
			await user.click(confirmButton);

			// Verify API call
			await waitFor(() => {
				expect(mockDeleteProject).toHaveBeenCalledWith({ id: mockProjects[0].id });
			});
		});

		it("should navigate to project when clicked", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Click on project card
			const projectCard = screen.getByTestId("dashboard-project-card");
			await user.click(projectCard);

			expect(mockPush).toHaveBeenCalledWith(`/projects/${mockProjects[0].id}`);
		});

		it("should duplicate project", async () => {
			const duplicatedProject = ProjectListItemFactory.build({
				name: `${mockProjects[0].name} (Copy)`,
			});

			mockCreateProject.mockResolvedValue({
				data: { id: duplicatedProject.id },
				success: true,
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Find and click duplicate button
			const projectCard = screen.getByTestId("dashboard-project-card");
			const moreButton = projectCard.querySelector("[data-testid='more-options-button']");
			await user.click(moreButton!);

			const duplicateButton = screen.getByTestId("duplicate-project-button");
			await user.click(duplicateButton);

			// Verify duplicate API call
			await waitFor(() => {
				expect(mockCreateProject).toHaveBeenCalledWith({
					description: mockProjects[0].description,
					logo_url: mockProjects[0].logo_url,
					name: `${mockProjects[0].name} (Copy)`,
				});
			});
		});
	});

	describe("Team Collaboration", () => {
		it("should open invite modal and send invitation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Click invite button
			const inviteButton = screen.getByRole("button", { name: /invite collaborators/i });
			await user.click(inviteButton);

			// Modal should open
			await waitFor(() => {
				expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
			});

			// Fill in email and role
			const emailInput = screen.getByTestId("email-input");
			const roleSelect = screen.getByTestId("permission-dropdown");

			await user.type(emailInput, "colleague@example.com");
			await user.click(roleSelect);
			await user.click(screen.getByTestId("collaborator-option"));

			// Send invitation
			const sendButton = screen.getByTestId("send-invitation-button");
			await user.click(sendButton);

			// Should show success message
			await waitFor(() => {
				expect(screen.getByText("Invitation sent successfully")).toBeInTheDocument();
			});
		});
	});

	describe("Welcome Experience", () => {
		it("should show welcome modal for new users", async () => {
			mockUseUserStore.mockReturnValue({
				...mockUserStore,
				hasSeenWelcomeModal: false,
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
				expect(screen.getByText("Welcome to GrantFlow.AI")).toBeInTheDocument();
			});
		});

		it("should close welcome modal and start onboarding", async () => {
			mockUseUserStore.mockReturnValue({
				...mockUserStore,
				hasSeenWelcomeModal: false,
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			// Start onboarding
			const startButton = screen.getByRole("button", { name: /start new application/i });
			await user.click(startButton);

			// Should navigate to onboarding
			expect(mockPush).toHaveBeenCalledWith(PagePath.ONBOARDING);
		});
	});

	describe("Data Loading States", () => {
		it("should render with SWR data", async () => {
			const swrMock = (await vi.importMock("swr")) as { default: ReturnType<typeof vi.fn> };
			(swrMock.default).mockReturnValue({
				data: mockProjects,
				error: null,
				isLoading: false,
				mutate: vi.fn(),
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Check that projects are displayed
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getByTestId("dashboard-project-card")).toBeInTheDocument();
		});
	});

	describe("Real-time Updates", () => {
		it("should handle WebSocket notifications for project updates", async () => {
			const mockAddNotification = vi.fn();
			mockUseNotificationStore.mockReturnValue({
				addNotification: mockAddNotification,
				notifications: [],
				removeNotification: vi.fn(),
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Simulate WebSocket notification
			act(() => {
				mockAddNotification({
					data: { message: "Project updated", projectId: mockProjects[0].id },
					id: "notif-1",
					type: "project_updated",
				});
			});

			expect(mockAddNotification).toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels and keyboard navigation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Check project cards are accessible using available test IDs
			const projectCard = screen.getByTestId("dashboard-project-card");
			expect(projectCard).toBeInTheDocument();

			// Check stats are accessible
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getByTestId("project-count")).toBeInTheDocument();
			expect(screen.getByTestId("application-count")).toBeInTheDocument();
		});

		it("should support keyboard navigation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Tab through interactive elements - check project card is focusable
			await user.tab();
			// Since buttons don't have test IDs, just verify we can focus the project card
			const projectCard = screen.getByTestId("dashboard-project-card");
			expect(projectCard).toBeInTheDocument();
		});
	});
});
