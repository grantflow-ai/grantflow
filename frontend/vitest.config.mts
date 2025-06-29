import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const suppressedErrors = [
	"Error: Not implemented: HTMLFormElement.prototype.requestSubmit",
	"(node:25503) [DEP0040]",
	"React does not recognize the `whileInView`",
];

export default defineConfig({
	plugins: [tsconfigPaths() as any, react() as any],
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
		globals: true,
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}", "**/*.spec.integration.{ts,tsx}"],
		onConsoleLog(log) {
			return !suppressedErrors.some((error) => log.includes(error));
		},
		setupFiles: ["./testing/setup.ts", "./testing/global-mocks.ts"],
	},
});