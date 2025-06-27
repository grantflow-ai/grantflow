import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { storybookEnv } from "../storybook-mocks/env";

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
			define: {
				"process.env": JSON.stringify({
					NODE_ENV: "development",
					...Object.fromEntries(Object.entries(storybookEnv).map(([key, value]) => [key, value.toString()])),
				}),
			},
			plugins: [react(), tsconfigPaths()],
		});
	},
};

export default config;
