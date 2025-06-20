import type { StorybookConfig } from "@storybook/experimental-nextjs-vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config: StorybookConfig = {
	addons: ["@storybook/addon-essentials", "@storybook/addon-onboarding"],
	env: (config) => {
		const envVars = { ...config };

		Object.keys(process.env).forEach((key) => {
			if (key.startsWith("NEXT_PUBLIC_")) {
				envVars[key] = process.env[key]!;
			}
		});

		return envVars;
	},
	framework: {
		name: "@storybook/experimental-nextjs-vite",
		options: {},
	},
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(mjs|ts|tsx)"],
	viteFinal: (config) => {
		config.plugins = [...(config.plugins ?? []), tsconfigPaths()];

		return config;
	},
};

export default config;
