// frontend/src/components/shared-layout.tsx
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ToastListener } from "@/components/toast-listener";

export function SharedLayout({ children }: { children: React.ReactNode }) {
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
