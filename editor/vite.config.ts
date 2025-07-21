/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: [".."],
		},
	},
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		environment: "jsdom",
		// Default configuration for unit tests
		globals: true,
		include: ["src/**/*.spec.{ts,tsx}"],
		setupFiles: "./vitest.setup.ts",
		// If you want to add back the storybook tests, you can add a projects array
		// For now, this simpler config will focus on getting unit tests running.
	},
});
