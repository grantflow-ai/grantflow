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
	transpilePackages: ["@grantflow/editor"],
} satisfies NextConfig;

export default nextConfig;
