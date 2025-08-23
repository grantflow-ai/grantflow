"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { DialogOverlay } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CookiePreferencesModalProps {
	onCancel: () => void;
	onSavePreferences: (preferences: { analytics: boolean }) => void;
	show: boolean;
}

interface ToggleSwitchProps {
	checked: boolean;
	"data-testid"?: string;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
	tooltipContent?: string;
	useCustomDisabledColor?: boolean;
}

export function CookiePreferencesModal({ onCancel, onSavePreferences, show }: CookiePreferencesModalProps) {
	const [analytics, setAnalytics] = useState(false);

	const handleSavePreferences = () => {
		onSavePreferences({ analytics });
	};

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
					data-testid="cookie-preferences-modal"
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
					<div className="flex flex-col text-center sm:text-left">
						<DialogPrimitive.Title className="text-2xl font-medium font-heading text-app-black leading-tight">
							Customize your cookie preferences
						</DialogPrimitive.Title>

						<DialogPrimitive.Description className="text-app-black leading-tight mt-3">
							We use cookies to enhance functionality and security. Choose which types to allow.
						</DialogPrimitive.Description>

						<div className="space-y-5 my-8">
							<div className="flex items-start justify-between">
								<div className="flex flex-col gap-2">
									<span className="font-semibold text-app-black leading-tight">
										Essential Cookies
									</span>
									<span className="text-app-black leading-tight">
										Required for core site functionality.
									</span>
								</div>
								<ToggleSwitch
									checked={true}
									data-testid="essential-cookies-switch"
									disabled
									onChange={function noop() {
										// ~keep - Required for disabled switch
									}}
									tooltipContent="Essential cookies are required for GrantFlow to function properly and cannot be disabled."
									useCustomDisabledColor
								/>
							</div>

							<div className="flex items-start justify-between">
								<div className="flex flex-col gap-2">
									<span className="font-semibold text-app-black leading-tight">
										Analytics Cookies
									</span>
									<span className="text-app-black leading-tight">
										Help us understand how users interact with GrantFlow.
									</span>
								</div>
								<ToggleSwitch
									checked={analytics}
									data-testid="analytics-cookies-switch"
									onChange={setAnalytics}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row justify-end sm:justify-between">
							<AppButton
								data-testid="cookie-preferences-cancel"
								onClick={onCancel}
								size="lg"
								variant="secondary"
							>
								Cancel
							</AppButton>
							<AppButton
								data-testid="cookie-preferences-save"
								onClick={handleSavePreferences}
								size="lg"
								variant="primary"
							>
								Save Preferences
							</AppButton>
						</div>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function ToggleSwitch({
	checked,
	"data-testid": dataTestId,
	disabled = false,
	onChange,
	tooltipContent,
	useCustomDisabledColor = false,
}: ToggleSwitchProps) {
	const getBackgroundColor = () => {
		if (disabled && checked && useCustomDisabledColor) {
			return "bg-app-lavender";
		}
		return checked ? "bg-primary" : "bg-gray-300";
	};

	const switchButton = (
		<button
			aria-checked={checked}
			className={cn(
				"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
				getBackgroundColor(),
			)}
			data-testid={dataTestId}
			disabled={disabled}
			onClick={() => {
				if (!disabled) {
					onChange(!checked);
				}
			}}
			role="switch"
			type="button"
		>
			<span
				className={cn(
					"inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
					checked ? "translate-x-5.5" : "translate-x-0.5",
				)}
			/>
		</button>
	);

	if (tooltipContent && disabled) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{switchButton}</TooltipTrigger>
					<TooltipContent
						className="text-sm max-w-2xs z-[102] text-center"
						showArrow
						side="left"
						sideOffset={4}
					>
						<p>{tooltipContent}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return switchButton;
}
