import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
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
	testDir: "./e2e",

	timeout: 60 * 1000,

	use: {
		actionTimeout: 30_000,

		baseURL: "http://localhost:3001",

		navigationTimeout: 30_000,

		screenshot: "only-on-failure",

		trace: "on-first-retry",
		video: "retain-on-failure",
	},

	webServer: {
		command: "PORT=3001 pnpm dev",
		port: 3001,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
	...(process.env.CI ? { workers: 1 } : {}),
});
