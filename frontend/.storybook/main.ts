import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config: StorybookConfig = {
	addons: ["@storybook/addon-docs"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	typescript: {
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			propFilter: (prop) => (prop.parent ? !prop.parent.fileName.includes("node_modules") : true),
			shouldExtractLiteralValuesFromEnum: true,
		},
	},
	viteFinal(config) {
		return mergeConfig(config, {
			plugins: [tsconfigPaths()],
			resolve: {
				alias: {
					// Use relative paths from project root instead of __dirname
					"@/styles/globals.css": "./storybook-mocks/globals.css",
					// Mock next/font imports for Storybook
					"@/utils/fonts": "./storybook-mocks/fonts.ts",
				},
			},
		});
	},
};

export default config;
