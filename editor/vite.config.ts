import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		copyPublicDir: false,
		emptyOutDir: true,
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "GrantFlowEditor",
			fileName: (format) => `index.${format}.js`,
			formats: ["es"],
		},
		outDir: "dist",
		rollupOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
			output: {
				preserveModules: false,
				exports: "named",
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
					"react/jsx-runtime": "react/jsx-runtime",
				},
				assetFileNames: "assets/[name][extname]",
			},
		},
		sourcemap: true,
	},
	plugins: [
		react(),
		tsconfigPaths(),
		libInjectCss(),
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
		}),
	],
	server: {
		fs: {
			allow: [".."],
		},
	},
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		environment: "jsdom",
		globals: true,
		include: ["src/**/*.spec.{ts,tsx}"],
		setupFiles: "./testing/vitest.setup.ts",
		testTimeout: 10000,
	},
});
