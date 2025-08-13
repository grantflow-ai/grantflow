Object.defineProperty(exports, "__esModule", { value: true });
var node_path_1 = require("node:path");
var vite_1 = require("vite");
var vite_tsconfig_paths_1 = require("vite-tsconfig-paths");
exports.default = (0, vite_1.defineConfig)({
	build: {
		// Don't copy public assets
		copyPublicDir: false,
		// Clear output directory before build
		emptyOutDir: true,
		// Library mode for Node.js backend
		lib: {
			entry: (0, node_path_1.resolve)(__dirname, "src/index.ts"),
			fileName: "index",
			formats: ["es"],
		},
		// Skip minification for better debugging
		minify: false,
		// Output directory
		outDir: "dist",
		// Skip reporting compressed size for faster builds
		reportCompressedSize: false,
		// Rollup configuration
		rollupOptions: {
			external: [
				// Exclude all Node.js built-ins
				/^node:/,
				// Exclude native bindings
				"pg-native",
				// Exclude all production dependencies
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
				// Simple output naming
				entryFileNames: "[name].js",
				// Use ES modules for Node.js
				format: "es",
			},
		},
		// Generate sourcemaps for debugging
		sourcemap: true,
		// SSR mode for Node.js
		ssr: true,
		// Target Node.js 22
		target: "node22",
	},
	// Optimization settings
	optimizeDeps: {
		include: undefined,
		// Disable dependency optimization for Node.js
		noDiscovery: true,
	},
	// Plugins
	plugins: [(0, vite_tsconfig_paths_1.default)()],
	// Path resolution
	resolve: {
		alias: {
			"@": (0, node_path_1.resolve)(__dirname, "src"),
		},
		// Use Node.js module resolution
		conditions: ["node"],
		mainFields: ["module", "jsnext:main", "jsnext"],
	},
	// SSR configuration
	ssr: {
		// Don't externalize any packages during SSR
		noExternal: true,
		// Target Node.js
		target: "node",
	},
	// Vitest configuration
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
