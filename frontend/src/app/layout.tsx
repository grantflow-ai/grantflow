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
	description: "AI powered grant writing",
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	openGraph: {
		description: "AI powered grant writing",
		emails: ["naaman@grantflow.ai", "asaf@grantflow.ai"],
		siteName: "GrantFlow.AI",
		title: "GrantFlow.AI",
		url: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
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
