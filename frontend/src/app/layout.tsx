import "@/styles/globals.css";

import type { Metadata } from "next";

import { ToastListener } from "@/components/toast-listener";
import { getEnv } from "@/utils/env";
import { fontCabin, fontSora, fontSourceSans } from "@/utils/fonts";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { ReactNode, Suspense } from "react";

export const metadata = {
	alternates: {
		canonical: "/",
	},
	authors: [{ name: "Na'aman Hirschfeld" }],
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
	publisher: "Vercel",
	referrer: "origin-when-cross-origin",
	robots: {
		follow: true,
		index: true,
	},
	title: "GrantFlow.AI",
} satisfies Metadata;

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link href="https://use.typekit.net/get1yhn.css" rel="stylesheet" />
				<link href="/favicon.svg" rel="icon" sizes="any" type="image/svg+xml" />
			</head>
			<body
				className={cn(
					"min-h-screen bg-background font-body antialiased",
					fontCabin.variable,
					fontSourceSans.variable,
					fontSora.variable,
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
					<main
						className="md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)] m-auto"
						data-testid="main-container"
					>
						{children}
					</main>
					<Toaster />
					<Suspense>
						<ToastListener />
					</Suspense>
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
