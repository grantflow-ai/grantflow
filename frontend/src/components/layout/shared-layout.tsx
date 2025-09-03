import { Suspense } from "react";
import { ToastListener } from "@/components/shared/toast-listener";
import { Toaster } from "@/components/ui/sonner";
import { CookiesProviderWrapper } from "@/providers/cookies-provider";

export default function SharedLayout({ children }: { children: React.ReactNode }) {
	return (
		<CookiesProviderWrapper>
			{children}
			<Toaster />
			<Suspense>
				<ToastListener />
			</Suspense>
		</CookiesProviderWrapper>
	);
}
