import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const storybookEnv = {
	NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.dev.acmetech.io",
	NEXT_PUBLIC_DEBUG: true,
	NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
	NEXT_PUBLIC_FIREBASE_APP_ID: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "acmetech-dev.firebaseapp.com",
	NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XYZ123ABC4",
	NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "847362514908",
	NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: "72a88c64-9b3d-4e5f-8c7a-1b2d3e4f5a6b",
	NEXT_PUBLIC_FIREBASE_PROJECT_ID: "acmetech-dev",
	NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "acmetech-dev.appspot.com",
	NEXT_PUBLIC_GCS_EMULATOR_URL: "http://localhost:9199",
	NEXT_PUBLIC_SITE_URL: "https://example.com",
	RESEND_API_KEY: "re_test_1234567890abcdef",
};

const config: StorybookConfig = {
	addons: ["@storybook/addon-docs"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	staticDirs: ["./public"],
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
			resolve: {
				alias: Object.assign({}, config.resolve?.alias, {
					"next/navigation": require.resolve("../.storybook/mocks/next-navigation.mock.ts"),
				}),
			},
		});
	},
};

export default config;
