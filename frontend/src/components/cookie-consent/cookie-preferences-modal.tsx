"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, Cookie, Info, Lock, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type CookiePreferences, useCookieConsentStore } from "@/stores/cookie-consent-store";

interface ToggleSwitchProps {
	checked: boolean;
	"data-testid"?: string;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}

export function CookiePreferencesModal() {
	const { acceptAllCookies, closePreferencesModal, preferences, showPreferencesModal, updatePreferences } =
		useCookieConsentStore();
	const [localPreferences, setLocalPreferences] = useState<CookiePreferences>(preferences);

	const handleSavePreferences = () => {
		updatePreferences(localPreferences);
	};

	const handleBack = () => {
		closePreferencesModal();
		useCookieConsentStore.getState().openConsentModal();
	};

	const handleToggleAnalytics = (checked: boolean) => {
		setLocalPreferences((prev) => ({ ...prev, analytics: checked }));
	};

	return (
		<DialogPrimitive.Root open={showPreferencesModal}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className={cn(
						"fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					)}
					data-testid="cookie-preferences-overlay"
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
					data-testid="cookie-preferences-modal"
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
						<div className="mb-6">
							<button
								className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
								data-testid="cookie-preferences-back"
								onClick={handleBack}
								type="button"
							>
								<ChevronLeft className="size-4" />
								Back
							</button>

							<div className="flex items-center gap-3">
								<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
									<Cookie className="size-6 text-primary" />
								</div>
								<h2 className="text-2xl font-semibold text-gray-900">Cookie Preferences</h2>
							</div>
						</div>

						<div className="space-y-6">
							<div className="space-y-4">
								<div className="rounded-lg border border-gray-200 p-4">
									<div className="mb-3 flex items-start justify-between">
										<div className="flex items-center gap-2">
											<Lock className="size-5 text-gray-600" />
											<Label className="text-base font-medium" htmlFor="essential-cookies">
												Essential Cookies
											</Label>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Info className="size-4 text-gray-400" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															These cookies are necessary for the website to function and
															cannot be switched off. They are usually set in response to
															your actions like logging in or filling forms.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<ToggleSwitch
											checked={true}
											data-testid="essential-cookies-switch"
											disabled
											onChange={() => {}}
										/>
									</div>
									<p className="text-sm text-gray-600">
										Required for basic site functionality, authentication, and security. These
										cannot be disabled.
									</p>
								</div>

								<div className="rounded-lg border border-gray-200 p-4">
									<div className="mb-3 flex items-start justify-between">
										<div className="flex items-center gap-2">
											<TrendingUp className="size-5 text-gray-600" />
											<Label className="text-base font-medium" htmlFor="analytics-cookies">
												Analytics Cookies
											</Label>
										</div>
										<ToggleSwitch
											checked={localPreferences.analytics}
											data-testid="analytics-cookies-switch"
											onChange={handleToggleAnalytics}
										/>
									</div>
									<p className="text-sm text-gray-600">
										Help us understand how visitors interact with our website by collecting and
										reporting information anonymously. This helps us improve your experience.
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<AppButton
									className="flex-1"
									data-testid="cookie-preferences-accept-all"
									onClick={acceptAllCookies}
									size="lg"
									variant="secondary"
								>
									Accept All
								</AppButton>
								<AppButton
									className="flex-1"
									data-testid="cookie-preferences-save"
									onClick={handleSavePreferences}
									size="lg"
									variant="primary"
								>
									Save Preferences
								</AppButton>
							</div>
						</div>

						<p className="mt-4 text-center text-xs text-gray-500">
							Learn more in our{" "}
							<a
								className="underline hover:text-gray-700"
								href="/privacy"
								rel="noopener noreferrer"
								target="_blank"
							>
								Privacy Policy
							</a>
						</p>
					</Card>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function ToggleSwitch({ checked, "data-testid": dataTestId, disabled = false, onChange }: ToggleSwitchProps) {
	return (
		<button
			aria-checked={checked}
			className={cn(
				"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
				checked ? "bg-primary" : "bg-gray-300",
				disabled && "cursor-not-allowed opacity-50",
			)}
			data-testid={dataTestId}
			disabled={disabled}
			onClick={() => !disabled && onChange(!checked)}
			role="switch"
			type="button"
		>
			<span
				className={cn(
					"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
					checked ? "translate-x-6" : "translate-x-1",
				)}
			/>
		</button>
	);
}
