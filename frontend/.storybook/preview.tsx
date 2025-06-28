import "@/styles/globals.css";
import "::storybook/mocks/storybook-theme.css";
import "::storybook/mocks/font-loader.css";

import type { Preview } from "@storybook/react-vite";
import { getEnv } from "@/utils/env";

getEnv();

const preview: Preview = {
	decorators: [
		(Story) => (
			<div className="font-body">
				<div className="min-h-screen bg-background text-foreground">
					<Story />
				</div>
			</div>
		),
	],
	parameters: {
		backgrounds: {
			default: "light",
			values: [
				{
					name: "light",
					value: "var(--background-light)",
				},
				{
					name: "dark",
					value: "var(--background-dark)",
				},
			],
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		nextjs: {
			appDirectory: true,
		},
	},
};

export default preview;
