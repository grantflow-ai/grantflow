import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const { getEnv } = await jiti.import("./src/utils/env.ts");

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
getEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
			timeout: 600,
		},
	},
};

export default nextConfig;
