import { defineConfig } from "tsup";

export default defineConfig({
	dts: true,
	entry: ["src/index.ts"],
	esbuildOptions(options) {
		options.alias = {
			"@": "./src",
		};
	},
	format: ["cjs"],
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
