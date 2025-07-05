import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { ToastListener } from "@/components/shared/toast-listener";
import { Toaster } from "@/components/ui/sonner";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
			{children}
			<Toaster />
			<Suspense>
				<ToastListener />
			</Suspense>
		</ThemeProvider>
	);
}
