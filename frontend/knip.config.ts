import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: [
		"src/app/**/page.tsx",
		"src/app/**/layout.tsx",
		"src/actions/**/*.ts",
		"src/components/**/*.tsx",
		"src/hooks/**/*.ts",
		"src/utils/**/*.ts",
		"src/stores/**/*.ts",
		"src/components/**/index.ts", // Include barrel exports
	],
	ignore: [
		"**/*.spec.{ts,tsx}",
		"**/*.test.{ts,tsx}",
		"**/*.stories.tsx",
		"**/setup.ts",
		"**/factories.{ts,py}",
		"**/global-mocks.ts",
		"vitest.config.mts",
		"vitest.setup.ts",
		"next.config.ts",
		"postcss.config.mjs",
		"components.json",
		"tailwind.config.ts",
		"scripts/migrate-to-new-logger.ts",
		".storybook/**",
		"playwright.config.ts",
		"testing/**",
		"tests/e2e/**",
	],
	ignoreBinaries: [
		"only-allow",
		"tsx",
		"biome",
		"cross-env",
		"storybook",
		"eslint",
		"knip",
		"playwright",
		"vitest",
		"tsc",
	],
	ignoreDependencies: ["@grantflow/editor", "tw-animate-css"],
	ignoreExportsUsedInFile: true,
	project: ["**/*.{ts,tsx,js,jsx}"],
};

export default config;
