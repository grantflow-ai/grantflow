import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const { getEnv } = await jiti.import("./src/utils/env.ts");

getEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config) => {
		config.externals.push("bun:sqlite");
		return config;
	},
};

export default nextConfig;
