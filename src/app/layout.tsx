import "@/styles/globals.css";

import type { Metadata } from "next";

import { ToastListener } from "@/components/toast-listener";
import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { Analytics } from "@vercel/analytics/next";
import { utils } from "@/lib/utils";
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
				<link href="/favicon.ico" rel="icon" sizes="any" />
			</head>
			<body className={utils("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
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
