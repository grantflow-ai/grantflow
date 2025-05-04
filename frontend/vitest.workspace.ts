import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname = typeof __dirname === "undefined" ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
	"vitest.config.mts",
	{
		plugins: [
			// The plugin will run tests for the stories defined in your Storybook config
			// See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
			storybookTest({ configDir: path.join(dirname, ".storybook") }),
		],
		test: {
			browser: {
				enabled: true,
				headless: true,
				instances: [{ browser: "chromium" }],
				provider: "playwright",
			},
			name: "storybook",
			setupFiles: [".storybook/vitest.setup.ts"],
		},
	},
]);
