import "@/styles/globals.css";

import type { Metadata } from "next";

import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { cn } from "gen/cn";
import { Toaster } from "gen/ui/sonner";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastListener } from "@/components/toast-listener";

export const metadata = {
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	title: "GrantFlow.AI",
	description: "AI powered grant writing",
	openGraph: {
		title: "GrantFlow.AI",
		description: "AI powered grant writing",
		siteName: "GrantFlow.AI",
		url: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
		emails: ["naaman@grantflow.ai", "asaf@grantflow.ai"],
	},
} satisfies Metadata;

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="dark" style={{ colorScheme: "dark" }}>
			<head>
				<link rel="stylesheet" href="https://use.typekit.net/get1yhn.css" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					<SessionProvider>
						<main
							className="md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)] m-auto"
							data-testid="main-container"
						>
							{children}
						</main>
						<Toaster />
						<ToastListener />
					</SessionProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
