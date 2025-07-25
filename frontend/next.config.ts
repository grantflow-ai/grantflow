import type { NextConfig } from "next";
import { getEnv } from "@/utils/env";

getEnv();

const nextConfig = {
	output: "standalone",
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
		},
	},
	images: {
		remotePatterns: [
			{
				hostname: "lh3.googleusercontent.com",
				pathname: "/**",
				protocol: "https",
			},
		],
	},
	transpilePackages: ["@grantflow/editor"],
} satisfies NextConfig;

export default nextConfig;
