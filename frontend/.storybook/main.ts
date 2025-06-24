import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: StorybookConfig = {
	addons: ["@storybook/addon-onboarding", "@storybook/addon-docs"],
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
					"@/styles/globals.css": path.resolve(__dirname, "../storybook-mocks/globals.css"),
					// Mock next/font imports for Storybook
					"@/utils/fonts": path.resolve(__dirname, "../storybook-mocks/fonts.ts"),
				},
			},
		});
	},
};

export default config;
