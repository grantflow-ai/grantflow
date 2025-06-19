import path from "node:path";

import { getEnv } from "@/utils/env";

import type { NextConfig } from "next";

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
	// @ts-expect-error, issue with turbopack ~keep
	nextConfig.outputFileTracingRoot = path.join(__dirname, "../");
}

export default nextConfig;
