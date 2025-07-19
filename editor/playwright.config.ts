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
		// You can add firefox and webkit back if needed
	],
	reporter: "html",
	retries: process.env.CI ? 2 : 0,
	testDir: "./tests", // A simpler test directory
	use: {
		// Use the correct base URL for Vite's default port
		baseURL: "http://127.0.0.1:5173",
		trace: "on-first-retry",
	},

	// This is the critical part for a Vite project
	webServer: {
		command: "pnpm dev", // The command to start the Vite server
		reuseExistingServer: !process.env.CI,
		url: "http://127.0.0.1:5173", // The URL to wait for
	},

	workers: process.env.CI ? 1 : undefined,
});
