import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { ToastListener } from "@/components/shared";
import { Toaster } from "@/components/ui/sonner";
import { CookiesProviderWrapper } from "@/providers/cookies-provider";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
	return (
		<CookiesProviderWrapper>
			<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
				{children}
				<Toaster />
				<Suspense>
					<ToastListener />
				</Suspense>
			</ThemeProvider>
		</CookiesProviderWrapper>
	);
}
