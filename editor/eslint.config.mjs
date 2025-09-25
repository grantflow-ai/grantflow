import js from "@eslint/js";
import biomePlugin from "eslint-config-biome";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooksPlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "warn",
			"perfectionist/sort-exports": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"react/prop-types": "off",
			"react/react-in-jsx-scope": "off",
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	{
		ignores: [
			"dist/",
			"node_modules/",
			"*.config.js",
			"*.config.ts",
			".storybook/",
			"storybook-static/",
			"playwright.config.d.ts",
			"lib/**/*.d.ts",
			"lib/**/*.js",
			"lib/**/*.js.map",
		],
	},
	biomePlugin,
);
