import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for mock environment testing
 * This config is optimized for testing with full mock API and auth bypass
 */
export default defineConfig({
	forbidOnly: !!process.env.CI,
	fullyParallel: true,

	// Only test on Chromium for speed in mock mode
	projects: [
		{
			name: "chromium-mock",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	reporter: "html",
	retries: process.env.CI ? 2 : 0,
	testDir: "./tests/e2e",

	use: {
		baseURL: "http://localhost:3001",
		screenshot: "only-on-failure",
		trace: "on-first-retry",
		video: "retain-on-failure",
	},

	// Start dev server with mock environment
	webServer: {
		command: "NEXT_PUBLIC_MOCK_API=true NEXT_PUBLIC_MOCK_AUTH=true PORT=3001 pnpm dev",
		port: 3001,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000, // Increase timeout for server startup
	},
	workers: process.env.CI ? 1 : undefined,
});
