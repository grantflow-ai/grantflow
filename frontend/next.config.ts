import type { NextConfig } from "next";
import { getEnv } from "@/utils/env";

getEnv();

const nextConfig = {
	transpilePackages: ["@grantflow/editor"],
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
} satisfies NextConfig;

export default nextConfig;
