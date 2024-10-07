import "@/styles/globals.css";

import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { type SupportedLocale, getLocale, i18n } from "@/i18n";
import { getEnv } from "@/utils/env";
import { fontSans } from "@/utils/fonts";
import { getServerClient } from "@/utils/supabase/server";
import { cn } from "gen/cn";
import { Toaster } from "gen/ui/sonner";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function generateStaticParams() {
	return i18n.locales.map((locale) => ({ lang: locale }));
}

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

export default async function RootLayout({
	children,
	params: { lang },
}: {
	children: ReactNode;
	params: { lang: SupportedLocale };
}) {
	const locales = await getLocale(lang);

	const client = await getServerClient();
	const { data } = await client.auth.getUser();

	return (
		<html lang={lang}>
			<head>
				<link rel="stylesheet" href="https://use.typekit.net/ehf1zsz.css" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
			</head>
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
					<Navbar isSignedIn={!!data.user} locale={lang} />
					<main className="md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)] m-auto" data-testid="main-container">
						{children}
					</main>
					<Footer locales={locales} />
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
