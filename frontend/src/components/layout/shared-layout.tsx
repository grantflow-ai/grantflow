import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { CookiesProviderWrapper } from "@/components/providers/cookies-provider";
import { ToastListener } from "@/components/shared/toast-listener";
import { Toaster } from "@/components/ui/sonner";

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
