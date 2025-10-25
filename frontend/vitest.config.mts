import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const suppressedErrors = [
	"Error: Not implemented: HTMLFormElement.prototype.requestSubmit",
	"(node:25503) [DEP0040]",
	"React does not recognize the `whileInView`",
	"[file-upload] File validation failed",
	"[file-upload] handleUploadFile failed - no parentId",
	"[file-upload] addFile failed, removed from pending uploads",
	"[file-upload] One or more file uploads failed",
	"Research objectives operation failed",
	"Failed to parse URL for tracking",
	"Skipping analytics - missing organizationId",
	"waitlist-form: onSubmit",
	"Failed to create project",
	"Invalid operation: Cannot drop main section",
	"create-application-button",
	"Failed to accept invitation",
	"No invitation token provided",
	"Network error",
	"Upload failed",
	"Failed to parse URL",
	"Invalid URL: not-a-valid-url",
];

export default defineConfig({
	cacheDir: "node_modules/.vite",
	plugins: [tsconfigPaths() as any, react() as any],
	resolve: {
		alias: {
			"::testing": path.resolve(__dirname, "./testing"),
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		coverage: {
			exclude: [
				"**/*.spec.*",
				"**/*.spec.integration.*",
				"**/*.stories.*",
				"**/*.d.ts",
				"src/types/*",
				"src/components/ui/*",
				"**/mocks/**",
				"src/utils/dev-indexing-patch.ts",
				"**/index.ts",
				"**/index.tsx",
			],
			include: ["src"],
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
		},
		environment: "jsdom",
		exclude: [
			"tests/e2e/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*"
		],
		globals: true,
		hookTimeout: 30_000,
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "**/*.spec.integration.{ts,tsx}"],
		isolate: true,
		maxWorkers: 1,
		onConsoleLog(log) {
			return !suppressedErrors.some((error) => log.includes(error));
		},
		pool: "forks",
		sequence: {
			concurrent: false,
			shuffle: false,
		},
		setupFiles: ["./testing/global-mocks.ts", "./testing/setup.ts", "./vitest.setup.ts"],
		teardownTimeout: 30_000,
		testTimeout: 30_000,
	},
});