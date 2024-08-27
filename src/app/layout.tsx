import "@/styles/globals.css";

import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { Navbar } from "@/components/navbar";
import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { cn } from "gen/cn";
import { Toaster } from "gen/ui/sonner";
import { ThemeProvider } from "next-themes";

export const metadata = {
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	title: "SaaS Template",
	description: "A template for building SaaS applications.",
	openGraph: {
		title: "SaaS Template",
		description: "A template for building SaaS applications.",
	},
} satisfies Metadata;

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en">
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					<Navbar />
					<main className="md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)]" data-testid="main-container">
						{children}
					</main>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
