import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const suppressedErrors = [
	"Error: Not implemented: HTMLFormElement.prototype.requestSubmit",
	"(node:25503) [DEP0040]",
	"React does not recognize the `whileInView`",
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
		hookTimeout: 10_000,
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "**/*.spec.integration.{ts,tsx}"],
		// Frontend tests don't need strict isolation (no database)
		// Disabling isolation for speed - tests are isolated by design
		isolate: false,
		onConsoleLog(log) {
			return !suppressedErrors.some((error) => log.includes(error));
		},
		pool: "threads",
		poolOptions: {
			threads: {
				maxThreads: 8,
				minThreads: 2,
				singleThread: false,
			},
		},
		// poolMatchGlobs is deprecated, using pool: "threads" for all tests
		sequence: {
			concurrent: true,
			shuffle: false,
		},
		setupFiles: ["./testing/setup.ts", "./testing/global-mocks.ts", "./vitest.setup.ts"],
		teardownTimeout: 10_000,
		testTimeout: 15_000,
	},
});