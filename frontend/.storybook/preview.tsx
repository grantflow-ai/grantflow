import "@/styles/globals.css";

import type { Preview } from "@storybook/nextjs-vite";
import { getEnv } from "@/utils/env";
import { fontCabin, fontSora, fontSourceSans } from "@/utils/fonts";

getEnv();

const preview: Preview = {
	decorators: [
		(Story) => (
			<div className={`${fontSourceSans.variable} ${fontCabin.variable} ${fontSora.variable}`}>
				<div className="bg-background text-foreground min-h-screen">
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
