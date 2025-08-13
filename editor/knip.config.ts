import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: ["src/index.ts"],
	ignore: [
		"dist/**",
		"storybook-static/**",
		"tailwind.config.ts",
		"postcss.config.mjs",
		".storybook/**",
		"playwright.config.ts",
		"eslint.config.*",
	],
	ignoreBinaries: ["only-allow", "biome", "cross-env", "storybook", "eslint", "playwright", "vitest", "tsc", "vite"],
	ignoreExportsUsedInFile: true,
	project: ["**/*.{ts,tsx,js,jsx}", "vite.config.ts"],
	tests: ["src/**/*.spec.{ts,tsx}", "testing/**/*.{ts,tsx}"],
};

export default config;
