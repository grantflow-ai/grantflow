import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	forbidOnly: !!process.env.CI,
	fullyParallel: true,
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	reporter: "html",
	retries: process.env.CI ? 2 : 0,
	testDir: "./tests",
	use: {
		baseURL: "http://127.0.0.1:5173",
		trace: "on-first-retry",
	},

	webServer: {
		command: "pnpm dev",
		reuseExistingServer: !process.env.CI,
		url: "http://127.0.0.1:5173",
	},

	workers: process.env.CI ? 1 : undefined,
});
