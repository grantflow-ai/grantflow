import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Run tests in files in parallel */
	fullyParallel: true,

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},

		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},

		/* Test against mobile viewports. */
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	testDir: "./tests/e2e",
	/* Global timeout for each test */
	timeout: 60 * 1000,
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		actionTimeout: 30_000,
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: "http://localhost:3001",

		/* Increase timeouts for navigation and actions */
		navigationTimeout: 30_000,

		/* Screenshot and video settings */
		screenshot: "only-on-failure",

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",
		video: "retain-on-failure",
	},

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "NEXT_PUBLIC_MOCK_API=true NEXT_PUBLIC_MOCK_AUTH=true PORT=3001 pnpm dev",
		port: 3001,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
});
