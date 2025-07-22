import type { NextConfig } from "next";
import { getEnv } from "@/utils/env";

getEnv();

const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
		},
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
				pathname: "/**",
			},
		],
	},
} satisfies NextConfig;

export default nextConfig;
