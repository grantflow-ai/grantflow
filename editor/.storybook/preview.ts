import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
	parameters: {
		a11y: {
			// 'todo' - show a11y violations in the test UI only
			test: "todo",
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
