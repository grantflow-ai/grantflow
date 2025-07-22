Object.defineProperty(exports, "__esModule", { value: true });
var config = {
	addons: [
		"@chromatic-com/storybook",
		"@storybook/addon-docs",
		"@storybook/addon-onboarding",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
};
exports.default = config;
