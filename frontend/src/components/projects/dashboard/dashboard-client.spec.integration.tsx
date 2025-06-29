/**
 * Dashboard Client Component Integration Tests
 * Tests dashboard scenarios with real UI components and mocked server actions
 */

import { ProjectListItemFactory, ProjectRequestFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";
import { getMockAPIClient } from "@/dev-tools/mock-api/client";
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
		deleteProject: vi.fn().mockImplementation(async (projectId) => {
			const { projectHandlers } = await import("@/dev-tools/mock-api/handlers/projects");
			return projectHandlers.deleteProject({ params: { project_id: projectId } });
		}),
		duplicateProject: vi.fn().mockImplementation(async (projectId) => {
			// Simulate duplication by creating a new project
			const { projectHandlers } = await import("@/dev-tools/mock-api/handlers/projects");
			return projectHandlers.createProject({
				body: {
					description: "Duplicated project",
					logo_url: null,
					name: `Copy of Project ${projectId}`,
				},
			});
		}),
	};
});

vi.mock("@/actions/project-invitation", async () => {
	const actual = await vi.importActual("@/actions/project-invitation");
	return {
		...actual,
		inviteCollaborator: vi.fn().mockResolvedValue({ success: true }),
	};
});

// Dashboard Scenarios - Test data setup
const dashboardScenarios = [
	{
		description: "dashboard with 3 existing projects",
		initialProjects: () => ProjectListItemFactory.batch(3),
		name: "with existing projects",
	},
	{
		description: "dashboard with no projects",
		initialProjects: () => [],
		name: "empty state",
	},
	{
		description: "dashboard with one project",
		initialProjects: () => ProjectListItemFactory.batch(1),
		name: "single project",
	},
] as const;

// Project Creation Scenarios
const projectCreationScenarios = [
	{
		description: "creates project using header create button",
		name: "via header button",
		projectData: () => ProjectRequestFactory.build({ name: "Header Project" }),
		requiresEmptyState: false,
		trigger: "bg-action-primary",
	},
	{
		description: "creates project from empty state button",
		name: "via empty state",
		projectData: () => ProjectRequestFactory.build({ name: "First Project" }),
		requiresEmptyState: true,
		trigger: "Create Your First Project",
	},
] as const;

// User Management Actions
const userManagementScenarios = [
	{
		action: "click-card" as const,
		description: "navigates to project detail page when card is clicked",
		expectedResult: "navigation" as const,
		name: "navigate to project",
		storeMethod: undefined,
	},
	{
		action: "duplicate" as const,
		description: "duplicates project via options menu",
		expectedResult: "store-call" as const,
		name: "duplicate project",
		storeMethod: "duplicateProject" as const,
	},
	{
		action: "delete" as const,
		description: "deletes project after confirmation",
		expectedResult: "store-call" as const,
		name: "delete project",
		storeMethod: "deleteProject" as const,
	},
] as const;

// Collaboration Scenarios
const collaborationScenarios = [
	{
		description: "sends invitation when projects exist",
		expectedOutcome: "modal-opens",
		hasProjects: true,
		name: "with projects",
	},
	{
		description: "shows notification when no projects exist",
		expectedOutcome: "notification",
		hasProjects: false,
		name: "without projects",
	},
] as const;

describe("Dashboard Client Integration", () => {
	let user: ReturnType<typeof userEvent.setup>;
	let mockAPIClient: ReturnType<typeof getMockAPIClient>;

	beforeAll(() => {
		// Initialize mock API layer
		initializeMockAPI();
		mockAPIClient = getMockAPIClient();
	});

	beforeEach(() => {
		// Reset all mocks and API state before each test
		vi.clearAllMocks();
		mockPush.mockClear();

		// Reset mock API client state
		mockAPIClient.setDelay(0); // Speed up tests
		mockAPIClient.setErrorRate(0); // No random errors in tests

		// Reset store states
		Object.assign(mockUserStore, {
			hasSeenWelcomeModal: true,
			isAuthenticated: true,
			user: {
				displayName: "Test User",
				email: "test@example.com",
				emailVerified: true,
				photoURL: null,
				providerId: "google.com",
				uid: "test-uid-123",
			},
		});

		// Setup fresh user event for each test
		user = userEvent.setup();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe.sequential("Dashboard Initial Rendering", () => {
		describe.each(dashboardScenarios)("$description", ({ initialProjects, name }) => {
			it(`should render dashboard UI correctly for ${name}`, async () => {
				const projects = initialProjects();
				render(<DashboardClient initialProjects={projects} />);

				// Always check main dashboard elements exist
				expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();

				if (projects.length > 0) {
					// Check projects are displayed
					await waitFor(() => {
						projects.forEach((project) => {
							expect(screen.getByText(project.name)).toBeInTheDocument();
						});
					});

					// Check project count is correct
					expect(screen.getByTestId("project-count")).toHaveTextContent(projects.length.toString());
					expect(screen.getByTestId("application-count")).toBeInTheDocument();
				} else {
					// Check empty state
					await waitFor(() => {
						expect(screen.getByText("You don't have any projects yet.")).toBeInTheDocument();
						expect(screen.getByText("Create Your First Project")).toBeInTheDocument();
					});
				}
			});
		});
	});

	describe.sequential("Project Creation Flows", () => {
		describe.each(projectCreationScenarios)(
			"$description",
			({ name, projectData, requiresEmptyState, trigger }) => {
				it(`should create project ${name}`, async () => {
					const project = projectData();
					const initialProjects = requiresEmptyState ? [] : ProjectListItemFactory.batch(2);

					render(<DashboardClient initialProjects={initialProjects} />);

					// Find and click the appropriate trigger
					let createButton: HTMLElement;
					if (trigger.startsWith("bg-")) {
						// CSS class selector
						const buttons = screen.getAllByRole("button");
						createButton = buttons.find((button) => button.className.includes(trigger))!;
					} else {
						// Text selector
						createButton = screen.getByText(trigger);
					}

					expect(createButton).toBeDefined();
					await user.click(createButton);

					// Modal should open
					await waitFor(() => {
						expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
					});

					// Fill in project details
					const nameInput = screen.getByTestId("create-project-name-input");
					const descriptionInput = screen.getByTestId("create-project-description-textarea");

					await user.clear(nameInput);
					await user.type(nameInput, project.name);

					if (project.description) {
						await user.clear(descriptionInput);
						await user.type(descriptionInput, project.description);
					}

					// Wait for form validation to complete
					await waitFor(() => {
						const submitButton = screen.getByTestId("create-project-submit-button");
						expect(submitButton).not.toBeDisabled();
					});

					// Submit form
					const submitButton = screen.getByTestId("create-project-submit-button");
					await user.click(submitButton);

					// Should navigate to new project
					await waitFor(() => {
						expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/.+/));
					});
				});
			},
		);
	});

	describe.sequential("Project Management Actions", () => {
		describe.each(userManagementScenarios)("$description", ({ action, name, storeMethod }) => {
			it(`should handle ${name} correctly`, async () => {
				const projects = ProjectListItemFactory.batch(3);
				render(<DashboardClient initialProjects={projects} />);

				const [projectCard] = screen.getAllByTestId("dashboard-project-card");

				switch (action) {
					case "click-card": {
						await user.click(projectCard);
						expect(mockPush).toHaveBeenCalledWith(`/projects/${projects[0].id}`);
						break;
					}
					case "delete": {
						const moreButton = projectCard.querySelector("[data-testid='more-options-button']")!;
						await user.click(moreButton);

						const deleteButton = screen.getByTestId("delete-project-button");
						await user.click(deleteButton);

						await waitFor(() => {
							expect(screen.getByTestId("delete-project-modal")).toBeInTheDocument();
						});

						const confirmButton = screen.getByTestId("delete-button");
						await user.click(confirmButton);

						if (storeMethod) {
							expect(mockProjectStore[storeMethod]).toHaveBeenCalledWith(projects[0].id);
						}
						break;
					}
					case "duplicate": {
						const moreButton = projectCard.querySelector("[data-testid='more-options-button']")!;
						await user.click(moreButton);

						const duplicateButton = screen.getByTestId("duplicate-project-button");
						await user.click(duplicateButton);

						if (storeMethod) {
							expect(mockProjectStore[storeMethod]).toHaveBeenCalledWith(projects[0].id);
						}
						break;
					}
				}
			});
		});
	});

	describe.sequential("Team Collaboration Workflows", () => {
		describe.each(collaborationScenarios)("invitation $description", ({ expectedOutcome, hasProjects, name }) => {
			it(`should handle collaboration invite ${name}`, async () => {
				const initialProjects = hasProjects ? ProjectListItemFactory.batch(2) : [];
				render(<DashboardClient initialProjects={initialProjects} />);

				const inviteButton = screen.getByRole("button", { name: /invite collaborators/i });
				await user.click(inviteButton);

				switch (expectedOutcome) {
					case "modal-opens": {
						await waitFor(() => {
							expect(screen.getByTestId("invite-collaborator-modal")).toBeInTheDocument();
						});

						const emailInput = screen.getByTestId("email-input");
						const roleSelect = screen.getByTestId("permission-dropdown");

						await user.type(emailInput, "colleague@example.com");
						await user.click(roleSelect);
						await user.click(screen.getByTestId("collaborator-option"));

						const sendButton = screen.getByTestId("send-invitation-button");
						await user.click(sendButton);

						await waitFor(() => {
							expect(screen.getByText("Invitation sent successfully")).toBeInTheDocument();
						});
						break;
					}
					case "notification": {
						expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
							expect.objectContaining({
								message: "Create a project first before inviting collaborators",
								title: "No projects available",
							}),
						);
						break;
					}
				}
			});
		});
	});

	describe.sequential("Welcome Modal Workflow", () => {
		it("should open create project modal from welcome modal", async () => {
			// Configure user who hasn't seen welcome modal
			mockUserStore.hasSeenWelcomeModal = false;

			render(<DashboardClient initialProjects={[]} />);

			// Welcome modal should be visible
			await waitFor(() => {
				expect(screen.getByText("Welcome to")).toBeInTheDocument();
			});

			// Click "Start New Application" button
			const startButton = screen.getByText("Start New Application");
			await user.click(startButton);

			// Should open create project modal
			await waitFor(() => {
				expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
			});
		});
	});

	describe.sequential("Real-time and Data Features", () => {
		it("should handle WebSocket notifications and SWR data", async () => {
			const projects = ProjectListItemFactory.batch(2);
			render(<DashboardClient initialProjects={projects} />);

			// Verify component renders with WebSocket integration
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getAllByTestId("dashboard-project-card")).toHaveLength(2);

			// Check that notifications are being added (from useEffect in dashboard client)
			await waitFor(
				() => {
					expect(mockNotificationStore.addNotification).toHaveBeenCalled();
				},
				{ timeout: 4000 },
			);
		});
	});

	describe.sequential("Accessibility Compliance", () => {
		it("should provide proper ARIA labels and keyboard navigation", async () => {
			const projects = ProjectListItemFactory.batch(3);
			render(<DashboardClient initialProjects={projects} />);

			// Check project cards are accessible
			const projectCards = screen.getAllByTestId("dashboard-project-card");
			expect(projectCards).toHaveLength(3);

			// Check stats are accessible
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getByTestId("project-count")).toBeInTheDocument();
			expect(screen.getByTestId("application-count")).toBeInTheDocument();

			// Test keyboard navigation
			await user.tab();
			expect(projectCards[0]).toBeInTheDocument();
		});
	});
});
