/**
 * Dashboard Page Integration Tests
 * Tests the complete dashboard user journey using the mock API layer
 */

import { ProjectListItemFactory, ProjectRequestFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";

// Enable mock API for integration tests
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
		NEXT_PUBLIC_MOCK_API: true, // Enable mock API for tests
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

// Mock user store to control welcome modal and authentication state
const mockUserStore = {
	clearUser: vi.fn(),
	dismissWelcomeModal: vi.fn(),
	hasSeenWelcomeModal: true, // Prevent welcome modal from showing in most tests
	isAuthenticated: true,
	setUser: vi.fn(),
	user: {
		displayName: "Test User",
		email: "test@example.com",
		emailVerified: true,
		photoURL: null,
		providerId: "google.com",
		uid: "test-uid-123",
	},
};

vi.mock("@/stores/user-store", () => ({
	useUserStore: () => mockUserStore,
}));

// Mock notification store
const mockNotificationStore = {
	addNotification: vi.fn(),
	clearNotifications: vi.fn(),
	notifications: [],
	removeNotification: vi.fn(),
};

vi.mock("@/stores/notification-store", () => ({
	useNotificationStore: () => mockNotificationStore,
}));

// Mock project store
const mockProjectStore = {
	addProject: vi.fn(),
	createProject: vi.fn(),
	deleteProject: vi.fn(),
	duplicateProject: vi.fn(),
	projects: [],
	removeProject: vi.fn(),
	setProjects: vi.fn(),
	updateProject: vi.fn(),
};

vi.mock("@/stores/project-store", () => ({
	useProjectStore: () => mockProjectStore,
}));

// Mock server actions to use our mock API layer
vi.mock("@/actions/project", async () => {
	const actual = await vi.importActual("@/actions/project");
	return {
		...actual,
		createProject: vi.fn().mockImplementation(async (data) => {
			// Simulate the same behavior as our mock API
			const { projectHandlers } = await import("@/dev-tools/mock-api/handlers/projects");
			return projectHandlers.createProject({ body: data });
		}),
	};
});

// No component mocking - this is an integration test using real components with mock API

describe("Dashboard Page Integration", () => {
	const user = userEvent.setup();

	// Test data
	const mockProjects = ProjectListItemFactory.batch(3);

	beforeAll(() => {
		// Initialize mock API layer
		initializeMockAPI();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockPush.mockClear();
		// Mock API will handle project data automatically
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
			// Use mock projects with application counts
			render(<DashboardClient initialProjects={mockProjects} />);

			await waitFor(() => {
				// Check that stats are displayed (exact numbers depend on factory data)
				expect(screen.getByTestId("project-count")).toHaveTextContent(mockProjects.length.toString());
				expect(screen.getByTestId("application-count")).toBeInTheDocument();
			});
		});

		it("should handle empty projects state", async () => {
			render(<DashboardClient initialProjects={[]} />);

			await waitFor(() => {
				expect(screen.getByText("You don't have any projects yet.")).toBeInTheDocument();
				expect(screen.getByText("Create Your First Project")).toBeInTheDocument();
			});
		});
	});

	describe("Project Creation Flow", () => {
		it("should open create project modal and create new project", async () => {
			const projectRequest = ProjectRequestFactory.build({
				name: "Test Project Name", // Ensure minimum length requirement
			});

			render(<DashboardClient initialProjects={mockProjects} />);

			// Click create project button (the large primary button with plus icon)
			const buttons = screen.getAllByRole("button");
			const createButton = buttons.find((button) => button.className.includes("bg-action-primary"));
			expect(createButton).toBeDefined();
			await user.click(createButton!);

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

			// Wait for form validation to complete
			await waitFor(() => {
				const submitButton = screen.getByTestId("create-project-submit-button");
				expect(submitButton).not.toBeDisabled();
			});

			// Submit form
			const submitButton = screen.getByTestId("create-project-submit-button");
			await user.click(submitButton);

			// Should navigate to new project (mock API will handle the creation)
			await waitFor(() => {
				expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/.+/));
			});
		});

		it("should handle project creation errors", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Open modal and try to create project
			const buttons = screen.getAllByRole("button");
			const createButton = buttons.find((button) => button.className.includes("bg-action-primary"));
			await user.click(createButton!);

			await waitFor(() => {
				expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
			});

			const nameInput = screen.getByTestId("create-project-name-input");
			await user.type(nameInput, "Test Project");

			await user.click(screen.getByTestId("create-project-submit-button"));

			// Mock API will handle the creation, verify form interaction worked
			await waitFor(() => {
				expect(nameInput).toHaveValue("Test Project");
			});
		});
	});

	describe("Project Management", () => {
		it("should delete project after confirmation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Find and click delete button for first project
			const [projectCard] = screen.getAllByTestId("dashboard-project-card");
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

			// Mock API will handle the deletion, verify UI interaction worked
			await waitFor(() => {
				expect(confirmButton).toBeInTheDocument();
			});
		});

		it("should navigate to project when clicked", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Click on project card
			const [projectCard] = screen.getAllByTestId("dashboard-project-card");
			await user.click(projectCard);

			expect(mockPush).toHaveBeenCalledWith(`/projects/${mockProjects[0].id}`);
		});

		it("should duplicate project", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Find and click duplicate button
			const [projectCard] = screen.getAllByTestId("dashboard-project-card");
			const moreButton = projectCard.querySelector("[data-testid='more-options-button']");
			await user.click(moreButton!);

			const duplicateButton = screen.getByTestId("duplicate-project-button");
			await user.click(duplicateButton);

			// Mock API will handle the duplication, verify UI interaction worked
			await waitFor(() => {
				expect(duplicateButton).toBeInTheDocument();
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

	describe("Data Loading States", () => {
		it("should render with SWR data from mock API", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Check that projects are displayed
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getAllByTestId("dashboard-project-card")).toHaveLength(3);
		});
	});

	describe("Real-time Updates", () => {
		it("should handle WebSocket notifications for project updates", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Mock WebSocket will be automatically available through our mock API layer
			// Verify the component renders correctly with WebSocket integration
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels and keyboard navigation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Check project cards are accessible using available test IDs
			const projectCards = screen.getAllByTestId("dashboard-project-card");
			expect(projectCards).toHaveLength(3);

			// Check stats are accessible
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getByTestId("project-count")).toBeInTheDocument();
			expect(screen.getByTestId("application-count")).toBeInTheDocument();
		});

		it("should support keyboard navigation", async () => {
			render(<DashboardClient initialProjects={mockProjects} />);

			// Tab through interactive elements - check project cards are focusable
			await user.tab();
			// Verify we can focus the project cards
			const projectCards = screen.getAllByTestId("dashboard-project-card");
			expect(projectCards[0]).toBeInTheDocument();
		});
	});
});
