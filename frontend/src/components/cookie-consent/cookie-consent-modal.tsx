"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Cookie, Shield } from "lucide-react";
import { useEffect } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCookieConsentStore } from "@/stores/cookie-consent-store";

export function CookieConsentModal() {
	const { acceptAllCookies, openPreferencesModal, showConsentModal } = useCookieConsentStore();

	useEffect(() => {
		document.body.style.overflow = showConsentModal ? "hidden" : "unset";

		return () => {
			document.body.style.overflow = "unset";
		};
	}, [showConsentModal]);

	return (
		<DialogPrimitive.Root open={showConsentModal}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className={cn(
						"fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					)}
					data-testid="cookie-consent-overlay"
				/>
				<DialogPrimitive.Content
					className={cn(
						"fixed left-[50%] top-[50%] z-[101] w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
						"data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
					)}
					data-testid="cookie-consent-modal"
					onEscapeKeyDown={(e) => {
						e.preventDefault();
					}}
					onInteractOutside={(e) => {
						e.preventDefault();
					}}
					onPointerDownOutside={(e) => {
						e.preventDefault();
					}}
				>
					<Card className="border-2 bg-white p-8 shadow-xl">
						<div className="mb-6 flex items-center gap-3">
							<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
								<Cookie className="size-6 text-primary" />
							</div>
							<h2 className="text-2xl font-semibold text-gray-900">Cookie Preferences</h2>
						</div>

						<div className="mb-6 space-y-4">
							<p className="text-gray-600">
								We use cookies to enhance your experience on GrantFlow. These help us understand how you
								use our platform and allow us to improve our services.
							</p>

							<div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4">
								<Shield className="mt-0.5 size-5 flex-shrink-0 text-blue-600" />
								<div className="text-sm text-blue-900">
									<p className="font-medium">Your privacy matters</p>
									<p className="mt-1 text-blue-800">
										Essential cookies are always enabled to ensure the platform works correctly. You
										can customize other cookie preferences.
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<AppButton
								className="flex-1"
								data-testid="cookie-consent-accept-all"
								onClick={acceptAllCookies}
								size="lg"
								variant="primary"
							>
								Accept All Cookies
							</AppButton>
							<AppButton
								className="flex-1"
								data-testid="cookie-consent-customize"
								onClick={openPreferencesModal}
								size="lg"
								variant="secondary"
							>
								Customize Preferences
							</AppButton>
						</div>

						<p className="mt-4 text-center text-xs text-gray-500">
							By continuing, you agree to our{" "}
							<a
								className="underline hover:text-gray-700"
								href="/privacy"
								rel="noopener noreferrer"
								target="_blank"
							>
								Privacy Policy
							</a>{" "}
							and{" "}
							<a
								className="underline hover:text-gray-700"
								href="/terms"
								rel="noopener noreferrer"
								target="_blank"
							>
								Terms of Service
							</a>
						</p>
					</Card>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
