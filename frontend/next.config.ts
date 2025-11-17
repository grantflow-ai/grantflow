import type { NextConfig } from "next";

const nextConfig = {
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
			{
				hostname: "storage.googleapis.com",
				pathname: "/**",
				protocol: "https",
			},
		],
	},
	output: "standalone",
	// Exclude pino from server bundling to prevent thread-stream test file issues
	serverExternalPackages: ["pino", "pino-pretty"],
	transpilePackages: ["@grantflow/editor"],
} satisfies NextConfig;

export default nextConfig;
