import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { getEnv } = await jiti.import("./src/utils/env.ts");

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
getEnv();

const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ["pino", "pino-pretty"],
	},
};

export default nextConfig;
