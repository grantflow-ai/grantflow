import { NextConfig } from "next";
import { getEnv } from "@/utils/env";
import path from "node:path";

getEnv();

const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
		},
	},
} satisfies NextConfig;

if (process.env.NODE_ENV === "development") {
	// workaround, see: https://github.com/vercel/next.js/discussions/55987 ~keep

	nextConfig.outputFileTracingRoot = path.join(__dirname, "../");
}

export default nextConfig;
