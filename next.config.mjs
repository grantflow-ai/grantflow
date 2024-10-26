import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const { getEnv } = await jiti.import("./src/utils/env.ts");

getEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "20mb",
		},
	},
};

export default nextConfig;
