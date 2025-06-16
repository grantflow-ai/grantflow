import path from "node:path";
import { fileURLToPath } from "node:url";

import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import eslintJS from "@eslint/js";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import eslintPluginImportX from "eslint-plugin-import-x";
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y";
import eslintPluginMarkdown from "eslint-plugin-markdown";
import eslintPluginNode from "eslint-plugin-n";
import eslintPluginPaths from "eslint-plugin-paths";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginPromise from "eslint-plugin-promise";
import eslintPluginReact from "eslint-plugin-react";
import reactPerfPlugin from "eslint-plugin-react-perf";
import eslintPluginStorybook from "eslint-plugin-storybook";
import eslintPluginTailwind from "eslint-plugin-tailwindcss";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import eslintPluginVitest from "eslint-plugin-vitest";
import globals from "globals";
import eslintTS from "typescript-eslint";

const compat = new FlatCompat();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default eslintTS.config(
	eslintJS.configs.recommended,
	...eslintTS.configs.strictTypeChecked,
	...eslintTS.configs.stylisticTypeChecked,
	eslintPluginNode.configs["flat/recommended-module"],
	eslintPluginPromise.configs["flat/recommended"],
	eslintPluginUnicorn.configs.recommended,
	eslintPluginPerfectionist.configs["recommended-alphabetical"],
	eslintPluginReact.configs.flat.recommended,
	reactPerfPlugin.configs.flat.recommended,
	eslintPluginJsxA11y.flatConfigs.recommended,
	...eslintPluginStorybook.configs["flat/recommended"],
	...eslintPluginTailwind.configs["flat/recommended"],
	...compat.extends("plugin:react-hooks/recommended"),
	...compat.extends("plugin:@next/next/core-web-vitals"),
	eslintPluginImportX.flatConfigs.recommended,
	eslintPluginImportX.flatConfigs.typescript,
	{
		ignores: ["!.storybook"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.serviceworker,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname,
			},
		},
		plugins: {
			"markdown": eslintPluginMarkdown,
			"paths": fixupPluginRules(eslintPluginPaths),
			"unused-imports": eslintPluginUnusedImports,
		},
		rules: {
			"@next/next/no-html-link-for-pages": "off",
			"@typescript-eslint/array-type": ["error", { default: "array" }],
			"@typescript-eslint/consistent-indexed-object-style": "error",
			"@typescript-eslint/consistent-type-definitions": "warn",
			"@typescript-eslint/naming-convention": [
				"error",
				{
					custom: {
						match: false,
						regex: "^[IT][A-Z]",
					},
					format: ["PascalCase"],
					selector: "interface",
				},
				{
					custom: {
						match: false,
						regex: "^[IT][A-Z]",
					},
					format: ["PascalCase"],
					selector: "typeAlias",
				},
				{
					format: ["UPPER_CASE"],
					selector: "enumMember",
				},
				{
					custom: {
						match: true,
						regex: "^[A-Z]$",
					},
					format: ["PascalCase"],
					selector: "typeParameter",
				},
			],
			"@typescript-eslint/no-extra-non-null-assertion": "error",
			"@typescript-eslint/no-floating-promises": ["error", { ignoreIIFE: true, ignoreVoid: true }],
			"@typescript-eslint/no-for-in-array": "error",
			"@typescript-eslint/no-inferrable-types": "error",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-redundant-type-constituents": "warn",
			"@typescript-eslint/no-require-imports": "warn",
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/no-unnecessary-qualifier": "warn",
			"@typescript-eslint/no-unnecessary-type-arguments": "error",
			"@typescript-eslint/no-unused-expressions": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { args: "all", argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-useless-constructor": "warn",
			"@typescript-eslint/no-useless-empty-export": "warn",
			"@typescript-eslint/prefer-as-const": "warn",
			"@typescript-eslint/prefer-for-of": "warn",
			"@typescript-eslint/prefer-includes": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/switch-exhaustiveness-check": "warn",
			"curly": "error",
			"eqeqeq": "error",
			"import-x/no-duplicates": "error",
			"import-x/no-named-as-default-member": "off",
			"import-x/order": [
				"error",
				{
					"alphabetize": {
						caseInsensitive: true,
						order: "asc",
					},
					"groups": ["builtin", "external", "internal", ["parent", "sibling", "index"], "object", "type"],
					"newlines-between": "always",
					"pathGroups": [
						{
							group: "internal",
							pattern: "@/**",
						},
					],
					"pathGroupsExcludedImportTypes": ["type"],
				},
			],
			"n/no-extraneous-import": "error",
			"n/no-missing-import": "off",
			"n/no-process-exit": "error",
			"n/no-unsupported-features/node-builtins": "off",
			"no-console": "warn",
			"no-unused-vars": "off",
			"object-shorthand": "error",
			"paths/alias": "error",
			"perfectionist/sort-imports": "off",
			"perfectionist/sort-named-imports": [
				"error",
				{
					order: "asc",
					type: "natural",
				},
			],
			"prefer-const": ["error", { destructuring: "all" }],
			"prefer-destructuring": "error",
			"prefer-template": "warn",
			"react-perf/jsx-no-new-function-as-prop": "off",
			"react-perf/jsx-no-new-object-as-prop": "off",
			"react/prop-types": "off",
			"react/react-in-jsx-scope": "off",
			"storybook/no-renderer-packages": "off",
			"tailwindcss/no-custom-classname": "off",
			"unicorn/catch-error-name": "off",
			"unicorn/explicit-length-check": "off",
			"unicorn/no-array-callback-reference": "off",
			"unicorn/no-array-for-each": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/no-nested-ternary": "off",
			"unicorn/no-null": "off",
			"unicorn/no-process-exit": "off",
			"unicorn/no-useless-undefined": "off",
			"unicorn/prefer-module": "off",
			"unicorn/prefer-string-raw": "off",
			"unicorn/prevent-abbreviations": "off",
			"unused-imports/no-unused-imports": "error",
		},
		settings: {
			"import-x/resolver-next": [
				createTypeScriptImportResolver({
					alwaysTryTypes: true,
					project: ["./frontend/tsconfig.json"],
				}),
			],
			"react": {
				version: "detect",
			},
		},
	},
	{
		extends: [eslintTS.configs.disableTypeChecked],
		files: ["**/*.js", "**/*.cjs", "**/*.mjs", "eslint.config.mjs"],
	},
	{
		files: ["**/*.md"],
		processor: "markdown/markdown",
	},
	{
		files: ["**/*.md/*.{ts,js,mts,mjs,cjs,cts,tsx,jsx,mtsx,mjsx}"],
		processor: "markdown/markdown",
	},
	{
		files: ["**/*.tsx"],
		ignores: ["**/coverage"],
		rules: {
			"@typescript-eslint/no-misused-promises": "off",
		},
	},
	{
		files: ["**/*.{spec,test}.{ts,tsx}", "**/{tests,test,__tests__,__mock__,__mocks__,testing}/*.ts"],
		plugins: {
			vitest: eslintPluginVitest,
		},
		rules: {
			...eslintPluginVitest.configs.recommended.rules,
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-implied-eval": "off",
			"@typescript-eslint/no-magic-numbers": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: false,
				},
			],
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/prefer-as-const": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/unbound-method": "off",
			"unicorn/error-message": "off",
			"unicorn/no-await-expression-member": "off",
		},
	},
	{
		ignores: [
			"**/.next",
			"**/.turbo",
			"**/__tmp__",
			"**/_next",
			"**/node_modules",
			"**/target",
			"**/gen",
			"**/coverage",
			"**/.coverage",
			"**/api-types.ts",
			"**/storybook-static",
		],
	},
	{
		files: ["**/*.spec.*"],
		rules: {
			"react-perf/jsx-no-new-array-as-prop": "off",
		},
	},
);
