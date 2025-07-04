import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { AppToaster } from "@/components/app/toaster";
import { ToastListener } from "@/components/shared/toast-listener";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
			{children}
			<AppToaster />
			<Suspense>
				<ToastListener />
			</Suspense>
		</ThemeProvider>
	);
}
