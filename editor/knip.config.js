"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
	entry: [
		"vite.config.ts", // Vite will discover src/index.ts through lib.entry
	],
	ignore: [
		"**/*.spec.{ts,tsx}",
		"**/*.test.{ts,tsx}",
		"**/*.stories.tsx",
		"**/setup.ts",
		"tailwind.config.ts",
		"postcss.config.mjs",
		".storybook/**",
		"playwright.config.ts",
		"testing/**",
		"dist/**",
		"src/app.tsx", // Vite dev entry point
		"src/main.tsx", // Vite dev entry point
		"eslint.config.js", // Legacy config file
		"knip.config.js", // Legacy config file
	],
	ignoreBinaries: ["only-allow", "biome", "cross-env", "storybook", "eslint", "playwright", "vitest", "tsc", "vite"],
	ignoreDependencies: ["@vitejs/plugin-react", "vite", "vite-plugin-dts", "vite-tsconfig-paths", "vitest"],
	ignoreExportsUsedInFile: true,
	project: ["**/*.{ts,tsx,js,jsx}"],
};
exports.default = config;
