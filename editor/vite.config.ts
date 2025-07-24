/// <reference types="vitest/config" />

import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	build: {
		copyPublicDir: false,
		emptyOutDir: false,
		lib: {
			entry: {
				index: resolve(__dirname, "lib/index.ts"),
			},
			fileName: (_format, entryName) => `${entryName}.js`,
			formats: ["es"],
		},
		outDir: "dist",
		rollupOptions: {
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"@tiptap/react",
				"@tiptap/core",
				"@tiptap/pm",
				"@tiptap/starter-kit",
				"@tiptap/extension-highlight",
				"@tiptap/extension-horizontal-rule",
				"@tiptap/extension-image",
				"@tiptap/extension-link",
				"@tiptap/extension-list",
				"@tiptap/extension-subscript",
				"@tiptap/extension-superscript",
				"@tiptap/extension-task-item",
				"@tiptap/extension-task-list",
				"@tiptap/extension-text-align",
				"@tiptap/extension-typography",
				"@tiptap/extension-underline",
				"@tiptap/extensions",
			],
			output: {
				preserveModules: false,
			},
		},
		sourcemap: true,
		target: "es2020",
	},
	plugins: [
		react(),
		tsconfigPaths(),
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
		}),
	],
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
