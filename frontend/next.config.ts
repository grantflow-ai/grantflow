import type { NextConfig } from "next";
import { getEnv } from "@/utils/env";

getEnv();

const nextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "100mb",
		},
	},
	reactStrictMode: false,
} satisfies NextConfig;

export default nextConfig;
