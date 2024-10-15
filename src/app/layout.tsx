import "@/styles/globals.css";

import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { cn } from "gen/cn";
import { Toaster } from "gen/ui/sonner";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

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

// eslint-disable-next-line @typescript-eslint/require-await
export default async function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<link rel="stylesheet" href="https://use.typekit.net/ehf1zsz.css" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					<Navbar />
					<main
						className="md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)] m-auto"
						data-testid="main-container"
					>
						{children}
					</main>
					<Footer />
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
