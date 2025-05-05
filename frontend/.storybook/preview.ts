import type { Preview } from "@storybook/react";
import "@/styles/globals.css";
import { getEnv } from "@/utils/env";

getEnv();

const preview: Preview = {
	parameters: {
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
