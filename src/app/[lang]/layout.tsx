import "@/styles/globals.css";

import { Navbar } from "@/components/navbar";
import { type SupportedLocale, i18n } from "@/i18n";
import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { cn } from "gen/cn";
import { Toaster } from "gen/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function generateStaticParams() {
	return i18n.locales.map((locale) => ({ lang: locale }));
}

export const metadata = {
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	title: "SaaS Template",
	description: "A template for building SaaS applications.",
	openGraph: {
		title: "SaaS Template",
		description: "A template for building SaaS applications.",
	},
} satisfies Metadata;

export default function RootLayout({
	children,
	params: { lang },
}: {
	children: ReactNode;
	params: { lang: SupportedLocale };
}) {
	return (
		<html lang={lang}>
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
