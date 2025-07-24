/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
// import noBundlePlugin from "vite-plugin-no-bundle";
// import { libInjectCss } from "vite-plugin-lib-inject-css";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react({ jsxRuntime: "classic" }),
		// noBundlePlugin(),
		tsconfigPaths(),
		// libInjectCss(),
		dts({ include: ["lib"] }),
	],
	build: {
		copyPublicDir: false,
		lib: {
			entry: resolve(__dirname, "lib/main.ts"),
			// name: "SimpleEditor",
			fileName: "main",
			formats: ["es"],
		},
		rollupOptions: {
			// No external CSS or HTML, only JS/TS output
			// input: resolve(__dirname, "src/index.ts"),
			// output: {
			// assetFileNames: () => "[name][extname]", // disables hashed asset output
			// },
			output: {
				generatedCode: "es2015",
				interop: "auto",
			},
			external: ["react", "react/jsx-runtime"],
		},
		outDir: "dist",
		emptyOutDir: true,
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: [".."],
		},
	},
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		environment: "jsdom",
		// Default configuration for unit tests
		globals: true,
		include: ["src/**/*.spec.{ts,tsx}"],
		setupFiles: "./vitest.setup.ts",
		// If you want to add back the storybook tests, you can add a projects array
		// For now, this simpler config will focus on getting unit tests running.
	},
});
