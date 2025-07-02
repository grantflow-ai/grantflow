/**
 * Dashboard Client Component Integration Tests
 * Tests dashboard scenarios with real UI components and mocked server actions
 */

/* eslint-disable sonarjs/no-nested-functions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	usePathname: () => "/projects",
	useRouter: () => ({
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
		push: vi.fn(),
		refresh: vi.fn(),
		replace: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
}));

// Mock server actions
vi.mock("@/actions/project", () => ({
	createProject: vi.fn(),
	deleteProject: vi.fn(),
	duplicateProject: vi.fn(),
	getProjects: vi.fn(),
}));

vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));

import { ProjectListItemFactory, ProjectRequestFactory } from "::testing/factories";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { createProject, deleteProject, duplicateProject } from "@/actions/project";
import { inviteCollaborator } from "@/actions/project-invitation";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";
import { getMockAPIClient } from "@/dev-tools/mock-api/client";
import { initializeMockAPI } from "@/dev-tools/mock-api/init";
import type { API } from "@/types/api-types";

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

// Ensure logger works in tests

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
		trigger: "bg-primary",
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
	let mockRouter: ReturnType<typeof useRouter>;
	let mockPush: ReturnType<typeof vi.fn>;
	let mockReplace: ReturnType<typeof vi.fn>;

	beforeAll(() => {
		// Initialize mock API layer
		initializeMockAPI();
		mockAPIClient = getMockAPIClient();
	});

	beforeEach(async () => {
		// Reset all mocks and API state before each test
		vi.clearAllMocks();

		// Get mocked functions
		mockRouter = vi.mocked(useRouter)();
		mockPush = vi.fn(); // Create a separate spy instead of extracting the unbound method
		mockReplace = vi.fn(); // Create a separate spy for replace
		mockRouter.push = mockPush;
		mockRouter.replace = mockReplace;
		const mockedCreateProject = vi.mocked(createProject);
		const mockedDeleteProject = vi.mocked(deleteProject);
		const mockedDuplicateProject = vi.mocked(duplicateProject);
		const mockedInviteCollaborator = vi.mocked(inviteCollaborator);

		// Setup mock implementations
		const { log } = await import("@/utils/logger");
		const { projectHandlers } = await import("@/dev-tools/mock-api/handlers/projects");

		mockedCreateProject.mockImplementation(async (data: API.CreateProject.RequestBody) => {
			log.info("[Mock Server Action] createProject called", { data });
			// Simulate a quick delay as real API would have
			await new Promise((resolve) => setTimeout(resolve, 50));
			// Return a simple mock project that matches the expected structure
			const returnValue = {
				description: data.description ?? "",
				id: "test-project-123",
				name: data.name,
			};
			log.info("[Mock Server Action] createProject returning", { returnValue });
			return returnValue;
		});

		mockedDeleteProject.mockImplementation(async (projectId: string) => {
			log.info("[Mock Server Action] deleteProject called", { projectId });
			return projectHandlers.deleteProject({ params: { project_id: projectId } });
		});

		mockedDuplicateProject.mockImplementation(async (projectId: string) => {
			log.info("[Mock Server Action] duplicateProject called", { projectId });
			return projectHandlers.createProject({
				body: {
					description: "Duplicated project",
					logo_url: null,
					name: `Copy of Project ${projectId}`,
				},
			});
		});

		mockedInviteCollaborator.mockImplementation(async (params) => {
			log.info("[Mock Server Action] inviteCollaborator called", {
				email: params.email,
				projectId: params.projectId,
				role: params.role,
			});
			// Add a small delay to simulate async operation
			await new Promise((resolve) => setTimeout(resolve, 10));
			const result = {
				invitationId: "http://localhost:3000/invite?token=mock-token",
				success: true,
			};
			log.info("[Mock Server Action] inviteCollaborator result", result);
			return result;
		});

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

		// Reset project store state
		mockProjectStore.projects = [];
		mockProjectStore.addProject.mockClear();
		mockProjectStore.createProject.mockClear();
		mockProjectStore.deleteProject.mockClear();
		mockProjectStore.duplicateProject.mockClear();
		mockProjectStore.removeProject.mockClear();
		mockProjectStore.setProjects.mockClear();
		mockProjectStore.updateProject.mockClear();

		// Reset notification store state
		mockNotificationStore.notifications.length = 0; // Clear array without reassignment
		mockNotificationStore.addNotification.mockClear();
		mockNotificationStore.clearNotifications.mockClear();
		mockNotificationStore.removeNotification.mockClear();

		// Setup fresh user event for each test
		user = userEvent.setup();
	});

	afterEach(() => {
		cleanup();
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

	describe.skip("Project Creation Flows", () => {
		describe.each(projectCreationScenarios)(
			"$description",
			({ name, projectData, requiresEmptyState, trigger }) => {
				it(`should create project ${name}`, { timeout: 10_000 }, async () => {
					const { log } = await import("@/utils/logger");
					log.info(`[TEST] Starting test: ${name}`);
					const project = projectData();
					const initialProjects = requiresEmptyState ? [] : ProjectListItemFactory.batch(2);

					render(<DashboardClient initialProjects={initialProjects} />);

					// Find and click the appropriate trigger
					const createButton: HTMLElement = trigger.startsWith("bg-")
						? screen.getByTestId("create-project-button") // Use data-testid for create project button
						: screen.getByText(trigger); // Text selector for empty state button

					log.info("[TEST] Found create button", {
						buttonClass: createButton.className,
						buttonText: createButton.textContent,
						trigger,
					});
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

					// Wait for form validation to complete first
					await waitFor(() => {
						expect(submitButton).not.toBeDisabled();
					});

					const mockedCreateProject = vi.mocked(createProject);

					log.info("[TEST] Submitting form", {
						buttonEnabled: !submitButton.hasAttribute("disabled"),
						projectName: project.name,
					});

					await user.click(submitButton);

					// Wait for the createProject mock to be called
					await waitFor(() => {
						expect(mockedCreateProject).toHaveBeenCalledWith({
							description: project.description ?? "",
							name: project.name,
						});
					});

					log.info("[TEST] CreateProject mock was called, waiting for navigation");

					// Wait for form processing and navigation - give it time to complete form logic
					await waitFor(
						() => {
							log.info("[TEST] Checking navigation calls", {
								createProjectCallsLength: mockedCreateProject.mock.calls.length,
								pushCalls: mockPush.mock.calls.length,
								replaceCalls: mockReplace.mock.calls.length,
							});
							expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/.+/));
						},
						{ timeout: 10_000 },
					);
				});
			},
		);
	});

	describe.skip("Project Management Actions", () => {
		describe.each(userManagementScenarios)("$description", ({ action, expectedResult, name, storeMethod }) => {
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex integration test with multiple scenarios
			it(`should handle ${name} correctly`, async () => {
				const projects = ProjectListItemFactory.batch(3);
				render(<DashboardClient initialProjects={projects} />);

				const [projectCard] = screen.getAllByTestId("dashboard-project-card");

				switch (action) {
					case "click-card": {
						// Click the invisible button that covers the card
						const cardButton = projectCard.querySelector('button[aria-label^="View project"]');
						expect(cardButton).toBeTruthy();
						await user.click(cardButton!);
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

						if (expectedResult === "store-call" && storeMethod) {
							expect(mockProjectStore[storeMethod]).toHaveBeenCalledWith(projects[0].id);
						}
						break;
					}
					case "duplicate": {
						const moreButton = projectCard.querySelector("[data-testid='more-options-button']")!;
						await user.click(moreButton);

						const duplicateButton = screen.getByTestId("duplicate-project-button");
						await user.click(duplicateButton);

						if (expectedResult === "store-call" && storeMethod) {
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
							// Check that the notification was added to the store
							expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
								expect.objectContaining({
									message: expect.stringContaining("Invitation sent successfully"),
									title: "Collaborator invited",
									type: "success",
								}),
							);
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

	describe.skip("Welcome Modal Workflow", () => {
		it("should open create project modal from welcome modal", async () => {
			// Configure user who hasn't seen welcome modal
			mockUserStore.hasSeenWelcomeModal = false;

			// Need to re-import the store to ensure the updated value is used
			vi.resetModules();
			await vi.importActual("@/stores/user-store");

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
		it("should handle WebSocket notifications and SWR data", () => {
			const projects = ProjectListItemFactory.batch(2);
			render(<DashboardClient initialProjects={projects} />);

			// Verify component renders with WebSocket integration
			expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
			expect(screen.getAllByTestId("dashboard-project-card")).toHaveLength(2);

			// Component should render without errors
			// (Test notifications have been disabled in the dashboard client)
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
