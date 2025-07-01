import { ThemeProvider } from "next-themes";
import { Suspense } from "react";

import { ToastListener } from "@/components/shared/toast-listener";
import { Toaster } from "@/components/ui/sonner";


export default function SharedLayout({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
			<div className="flex h-screen">
			
				<main className="flex-1">{children}</main>
			</div>
			<Toaster />
			<Suspense>
				<ToastListener />
			</Suspense>
		</ThemeProvider>
	);
}
