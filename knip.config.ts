import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignore: [
		"terraform/**",
		"diagrams/**",
		"scripts/**",
		"testing/**",
		"**/*.spec.{ts,tsx}",
		"**/*.test.{ts,tsx}",
		"**/*_test.py",
		"**/*.stories.tsx",
		"**/conftest.py",
		"**/setup.ts",
		"**/factories.{ts,py}",
		"**/global-mocks.ts",
		"vitest.config.mts",
		"eslint.config.mjs",
		"next.config.ts",
		"postcss.config.mjs",
		"components.json",
		"tailwind.config.ts",
	],
	ignoreBinaries: ["only-allow", "eslint", "cross-env"],
	workspaces: {
		frontend: {
			entry: [
				"src/app/**/page.tsx",
				"src/app/**/layout.tsx",
				"src/actions/**/*.ts",
				"src/components/**/*.tsx",
				"src/hooks/**/*.ts",
				"src/utils/**/*.ts",
				"src/stores/**/*.ts",
				"testing/utils.ts",
			],
			ignore: ["storybook-static/**", ".next/**", "node_modules/**"],
			ignoreDependencies: ["tailwindcss", "tw-animate-css"],
			project: ["**/*.{ts,tsx,js,jsx}"],
		},
		"services/backend": {
			entry: ["src/main.py"],
			ignore: ["__pycache__/**", "*.pyc"],
			project: ["**/*.py"],
		},
		"services/crawler": {
			entry: ["src/main.py"],
			ignore: ["__pycache__/**", "*.pyc"],
			project: ["**/*.py"],
		},
		"services/indexer": {
			entry: ["src/main.py"],
			ignore: ["__pycache__/**", "*.pyc"],
			project: ["**/*.py"],
		},
		"services/rag": {
			entry: ["src/main.py"],
			ignore: ["__pycache__/**", "*.pyc"],
			project: ["**/*.py"],
		},
	},
};

export default config;
