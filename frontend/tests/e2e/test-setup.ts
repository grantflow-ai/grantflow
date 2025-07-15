import { test as base } from "@playwright/test";

// Extend the base test to include setup
export const test = base.extend({
	// Auto-fixture that runs before each test
	page: async ({ page }, use) => {
		// Clear local storage to ensure clean state
		await page.addInitScript(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		// Set mock auth flag in localStorage before navigation
		await page.addInitScript(() => {
			// Ensure user store has proper state
			const userStore = {
				state: {
					hasSeenWelcomeModal: true,
					isAuthenticated: true,
					user: {
						displayName: "Test User",
						email: "test@example.com",
						emailVerified: true,
						photoURL: null,
						providerId: "password",
						uid: "mock-user-123",
					},
				},
				version: 0,
			};
			localStorage.setItem("user-store", JSON.stringify(userStore));

			// Test constants for consistent IDs (UUIDs)
			const TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
			const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440001";

			// Set up navigation store with test project and application IDs
			const navigationStore = {
				state: {
					activeApplicationId: TEST_APPLICATION_ID,
					activeProjectId: TEST_PROJECT_ID,
				},
				version: 0,
			};
			localStorage.setItem("navigation-store", JSON.stringify(navigationStore));
		});

		// Configure mock API for faster tests
		await page.addInitScript(() => {
			// Set up faster mock API delays for testing
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(globalThis as any).__MOCK_API_DELAY__ = 100; // 100ms instead of 3000ms

			// Clear mock stores to ensure consistent test state
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ((globalThis as any).clearAllMockStores) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				(globalThis as any).clearAllMockStores();
			}
		});

		// Set scenario for tests that need populated data
		await page.addInitScript(() => {
			// Wait for mock API client to be available
			const waitForMockAPI = () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if ((globalThis as any).getMockAPIClient) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					(globalThis as any).getMockAPIClient().setScenario("template-with-sources");
				} else {
					setTimeout(waitForMockAPI, 50);
				}
			};
			waitForMockAPI();
		});

		// Pre-populate stores with test data to avoid loading states
		await page.addInitScript(() => {
			// Test constants for consistent IDs (UUIDs) - redeclared in this context
			const TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
			const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440001";
			const TEST_TEMPLATE_ID = "550e8400-e29b-41d4-a716-446655440002";

			// Set up project store with the test project
			const projectStore = {
				state: {
					areOperationsInProgress: false,
					project: {
						created_at: new Date().toISOString(),
						description: "Test project description",
						grant_applications: [
							{
								completed_at: null,
								created_at: new Date().toISOString(),
								id: TEST_APPLICATION_ID,
								project_id: TEST_PROJECT_ID,
								status: "DRAFT",
								title: "Grant Application with Template Sources",
								updated_at: new Date().toISOString(),
							},
						],
						id: TEST_PROJECT_ID,
						logo_url: null,
						name: "Research Project with Sources",
						role: "OWNER",
						updated_at: new Date().toISOString(),
					},
					projects: [
						{
							applications_count: 1,
							description: "Test project description",
							id: TEST_PROJECT_ID,
							logo_url: null,
							members: [
								{
									display_name: "Test User",
									email: "test@example.com",
									firebase_uid: "mock-user-123",
									photo_url: null,
									role: "OWNER",
								},
							],
							name: "Research Project with Sources",
							role: "OWNER",
						},
					],
				},
				version: 0,
			};
			localStorage.setItem("project-store", JSON.stringify(projectStore));

			// Set up application store with the test application
			const applicationStore = {
				state: {
					application: {
						completed_at: null,
						created_at: new Date().toISOString(),
						form_inputs: null,
						grant_template: {
							created_at: new Date().toISOString(),
							funding_organization: {
								abbreviation: "TFO",
								created_at: new Date().toISOString(),
								full_name: "Test Funding Organization",
								id: "org-1",
								logo_url: null,
								updated_at: new Date().toISOString(),
							},
							grant_sections: [],
							id: TEST_TEMPLATE_ID,
							rag_sources: [
								{
									filename: "research-proposal.pdf",
									sourceId: "src-1",
									status: "FINISHED",
								},
								{
									filename: "project-guidelines.docx",
									sourceId: "src-2",
									status: "FINISHED",
								},
							],
							status: "DRAFT",
							submission_date: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString(),
							title: "Grant Template",
							updated_at: new Date().toISOString(),
						},
						id: TEST_APPLICATION_ID,
						project_id: TEST_PROJECT_ID,
						rag_job_id: null,
						rag_sources: [],
						research_objectives: [],
						status: "DRAFT",
						text: null,
						title: "Grant Application with Template Sources",
						updated_at: new Date().toISOString(),
					},
					areAppOperationsInProgress: false,
					ragJobState: {
						isRestoring: false,
						restoredJob: null,
					},
				},
				version: 0,
			};
			localStorage.setItem("application-store", JSON.stringify(applicationStore));
		});

		// Use the page
		await use(page);
	},
});

export { expect } from "@playwright/test";
