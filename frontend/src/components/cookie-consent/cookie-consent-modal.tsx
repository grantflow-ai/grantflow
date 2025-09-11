"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppButton } from "@/components/app/buttons/app-button";
import { DialogOverlay } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CookieConsentModal({
	onAcceptAll,
	onCustomize,
	show,
}: {
	onAcceptAll: () => void;
	onCustomize: () => void;
	show: boolean;
}) {
	return (
		<DialogPrimitive.Root open={show}>
			<DialogPrimitive.Portal>
				<DialogOverlay />
				<DialogPrimitive.Content
					className={cn(
						"fixed bottom-6 right-6 z-[101] w-full max-w-md",
						"bg-white rounded-md p-6 shadow-lg outline-1 outline-offset-[-1px] outline-primary",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[state=closed]:slide-out-to-bottom-6 data-[state=closed]:slide-out-to-right-6",
						"data-[state=open]:slide-in-from-bottom-6 data-[state=open]:slide-in-from-right-6",
					)}
					data-testid="cookie-consent-modal"
					onEscapeKeyDown={(e) => {
						e.preventDefault();
					}}
					onInteractOutside={(e) => {
						e.preventDefault();
					}}
					onOpenAutoFocus={(e) => {
						e.preventDefault();
					}}
					onPointerDownOutside={(e) => {
						e.preventDefault();
					}}
				>
					<div className="flex flex-col gap-3 text-center sm:text-left">
						<DialogPrimitive.Title className="text-2xl font-medium font-heading text-app-black leading-tight">
							We value your privacy
						</DialogPrimitive.Title>

						<DialogPrimitive.Description className="text-app-black leading-tight">
							GrantFlow uses cookies to improve your experience, personalize content, and analyze traffic.
							You can manage your preferences at any time.
						</DialogPrimitive.Description>

						<div className="flex flex-col gap-2 mt-3 sm:flex-row justify-end sm:justify-between">
							<AppButton
								data-testid="cookie-consent-customize"
								onClick={onCustomize}
								size="lg"
								variant="secondary"
							>
								Customize
							</AppButton>
							<AppButton
								data-testid="cookie-consent-accept-all"
								onClick={onAcceptAll}
								size="lg"
								variant="primary"
							>
								Accept All
							</AppButton>
						</div>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
