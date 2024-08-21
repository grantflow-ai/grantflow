import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./testing/setup.ts", "./testing/global-mocks.ts"],
		coverage: {
			include: ["src"],
			exclude: ["**/*.spec.*", "**/*.d.ts", "src/types/*"],
		},
		onConsoleLog(log) {
			// suppress errors and warning that spam the console during tests
			if (log.includes("Error: Not implemented: HTMLFormElement.prototype.requestSubmit")) {
				return false;
			}
			if (log.includes("(node:25503) [DEP0040]")) {
				return false;
			}
		},
	},
});
