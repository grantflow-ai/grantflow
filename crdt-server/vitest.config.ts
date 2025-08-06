import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		exclude: ["node_modules", "dist"],
		globals: true,
		include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
		setupFiles: ["./testing/setup.ts"],
	},
});
