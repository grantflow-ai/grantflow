import { test as base } from "@playwright/test";

export const test = base.extend({
	page: async ({ page }, use) => {
		await page.addInitScript(() => {
			localStorage.clear();
			sessionStorage.clear();
		});

		await page.addInitScript(() => {
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

			const TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
			const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440001";

			const navigationStore = {
				state: {
					activeApplicationId: TEST_APPLICATION_ID,
					activeProjectId: TEST_PROJECT_ID,
				},
				version: 0,
			};
			localStorage.setItem("navigation-store", JSON.stringify(navigationStore));
		});

		await page.addInitScript(() => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(globalThis as any).__MOCK_API_DELAY__ = 100;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if ((globalThis as any).clearAllMockStores) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				(globalThis as any).clearAllMockStores();
			}
		});

		await page.addInitScript(() => {
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

		await page.addInitScript(() => {
			const TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
			const TEST_APPLICATION_ID = "550e8400-e29b-41d4-a716-446655440001";
			const TEST_TEMPLATE_ID = "550e8400-e29b-41d4-a716-446655440002";

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

			const applicationStore = {
				state: {
					application: {
						completed_at: null,
						created_at: new Date().toISOString(),
						form_inputs: null,
						grant_template: {
							created_at: new Date().toISOString(),
							grant_sections: [],
							granting_institution: {
								abbreviation: "TGI",
								created_at: new Date().toISOString(),
								full_name: "Test Granting Institution",
								id: "org-1",
								logo_url: null,
								updated_at: new Date().toISOString(),
							},
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

		await use(page);
	},
});

export { expect } from "@playwright/test";
