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
	],
	ignore: [
		"**/*.spec.{ts,tsx}",
		"**/*.test.{ts,tsx}",
		"**/*.stories.tsx",
		"**/setup.ts",
		"**/factories.{ts,py}",
		"**/global-mocks.ts",
		"vitest.config.mts",
		"next.config.ts",
		"postcss.config.mjs",
		"components.json",
		"tailwind.config.ts",
		"scripts/migrate-to-new-logger.ts",
	],
	ignoreBinaries: ["only-allow", "tsx"],
	ignoreDependencies: ["@next/eslint-plugin-next", "eslint-plugin-react-hooks", "@commitlint/cli", "tailwindcss"],
	project: ["**/*.{ts,tsx,js,jsx}"],
};

export default config;