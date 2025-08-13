import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		copyPublicDir: false,
		emptyOutDir: true,
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			fileName: "index",
			formats: ["es"],
		},
		minify: false,
		outDir: "dist",
		reportCompressedSize: false,
		rollupOptions: {
			external: [
				/^node:/,
				"pg-native",
				"@google-cloud/pino-logging-gcp-config",
				"@hocuspocus/extension-database",
				"@hocuspocus/server",
				"dotenv",
				"drizzle-orm",
				"pg",
				"pino",
				"ws",
				"zod",
			],
			output: {
				chunkFileNames: "[name]-[hash].js",
				entryFileNames: "[name].js",
				format: "es",
			},
		},
		sourcemap: true,
		ssr: true,
		target: "node22",
	},
	optimizeDeps: {
		include: undefined,
		noDiscovery: true,
	},
	plugins: [tsconfigPaths()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
		conditions: ["node"],
		mainFields: ["module", "jsnext:main", "jsnext"],
	},
	ssr: {
		noExternal: true,
		target: "node",
	},
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
		},
		environment: "node",
		globals: true,
		include: ["src/**/*.spec.ts"],
		setupFiles: "./testing/setup.ts",
		testTimeout: 10_000,
	},
});
