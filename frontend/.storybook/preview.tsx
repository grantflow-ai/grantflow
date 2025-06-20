import "@/styles/globals.css";

import type { Preview } from "@storybook/react";
import { getEnv } from "@/utils/env";
import { fontCabin, fontSora, fontSourceSans } from "@/utils/fonts";

getEnv();

const preview: Preview = {
	decorators: [
		(Story) => (
			<div className={`${fontSourceSans.variable} ${fontCabin.variable} ${fontSora.variable}`}>
				<Story />
			</div>
		),
	],
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
