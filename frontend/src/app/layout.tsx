import "@/styles/globals.css";

import type { Metadata } from "next";

import { getEnv } from "@/utils/env";
import { fontCabin, fontSora, fontSourceSans } from "@/utils/fonts";
import { cn } from "@/lib/utils";
import { PagePath } from "@/enums";

export const metadata = {
	alternates: {
		canonical: PagePath.ROOT,
	},
	authors: [{ name: "GrantFlow.AI" }],
	description:
		"GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow. Try it for free!",
	formatDetection: {
		email: false,
		telephone: false,
	},
	keywords: ["grant writing", "research grants", "AI assistant", "funding applications", "academic grants"],
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	openGraph: {
		description:
			"GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow. Try it for free!",
		emails: ["admin@grantflow.ai"],
		images: [
			{
				alt: "GrantFlow.AI Preview Image",
				height: 630,
				url: "https://www.grantflow.ai/opengraph-image.png",
				width: 1200,
			},
		],
		locale: "en_US",
		siteName: "GrantFlow.AI",
		title: "Ready to Focus on Research, Not Paperwork?",
		type: "website",
		url: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	},
	publisher: "GrantFlow.ai",
	referrer: "origin-when-cross-origin",
	title: "GrantFlow.AI",
} satisfies Metadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"min-h-screen bg-background font-body antialiased",
					fontCabin.variable,
					fontSourceSans.variable,
					fontSora.variable,
				)}
			>
				{children}
			</body>
		</html>
	);
}
