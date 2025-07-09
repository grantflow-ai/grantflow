"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppDialogDescription, AppDialogTitle } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { PROGRESS_BAR_STEPS } from "@/constants";
import { PagePath } from "@/enums";
import { useUserStore } from "@/stores/user-store";
import { WelcomeModalContent } from "./modal-overlay";
import { ProgressBar } from "./progress-bar";

interface WelcomeModalProps {
	onStartApplication?: () => void;
}

export function WelcomeModal({ onStartApplication }: WelcomeModalProps) {
	const router = useRouter();
	const { dismissWelcomeModal, hasSeenWelcomeModal } = useUserStore();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(1);

	useEffect(() => {
		// Don't show welcome modal in test environment
		const isTestEnvironment = process.env.NODE_ENV === "test" || globalThis.location.port === "3001";
		if (!(hasSeenWelcomeModal || isTestEnvironment)) {
			setOpen(true);
		}
	}, [hasSeenWelcomeModal]);

	useEffect(() => {
		if (!open) return;

		const interval = setInterval(() => {
			setStep((prev) => (prev < PROGRESS_BAR_STEPS.length ? prev + 1 : 1));
		}, 2000);

		return () => {
			clearInterval(interval);
		};
	}, [open]);

	const handleClose = () => {
		dismissWelcomeModal();
		setOpen(false);
	};

	const handleStartApplication = () => {
		handleClose();
		if (onStartApplication) {
			onStartApplication();
		} else {
			router.push(PagePath.PROJECTS);
		}
	};

	return (
		<DialogPrimitive.Root
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					handleClose();
				}
			}}
			open={open}
		>
			<WelcomeModalContent className="flex max-w-[1080px] flex-col overflow-hidden rounded-lg border border-border-primary bg-white">
				<header className="relative flex h-[152px] w-full items-center justify-center overflow-hidden bg-surface-secondary">
					<div className="absolute -left-32 top-40 size-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_var(--color-primary)_0%,_transparent_70%)] opacity-30" />
					<ProgressBar currentStep={step} />
				</header>
				<section className="flex w-full justify-between px-16 py-16">
					<AppDialogTitle className="flex-shrink-0 text-[48px] font-medium leading-[58px] text-black font-heading">
						Welcome to
						<br />
						GrantFlow!
					</AppDialogTitle>

					<AppDialogDescription asChild className="flex w-[597px] flex-col gap-10">
						<div>
							<div className="flex flex-col gap-6">
								<p className="text-[16px] font-normal leading-[24px] text-black font-body">
									<span className="font-semibold">GrantFlow</span> was built for researchers, designed
									to save dozens of hours and bring you closer to submission, quickly and efficiently.
								</p>
								<p className="text-[16px] font-normal leading-[24px] text-black font-body">
									Powered by AI, the system will generate a draft application tailored to your needs
									based on the materials and information you provide. The more accurate and detailed
									your input, the closer the result will be to what you need.
								</p>
							</div>
							<article className="flex gap-1 rounded-lg border border-app-slate-blue bg-light-gray p-2">
								<div className="size-5 flex-shrink-0 mt-0.5">
									<AlertCircle className="text-gray-700 size-4" />
								</div>
								<p className="text-[14px] font-normal leading-[21px] text-black font-body">
									Keep in mind that AI has limitations and may occasionally make mistakes. Always
									review and refine the output using the editor.
								</p>
							</article>
						</div>
					</AppDialogDescription>
				</section>
				<footer className="flex w-full items-center justify-between px-16 pb-16">
					<AppButton className="w-28  px-4 py-2 " onClick={handleClose} variant="secondary">
						Later
					</AppButton>
					<AppButton className="  px-4 py-2 " onClick={handleStartApplication} variant="primary">
						Start New Application
					</AppButton>
				</footer>
			</WelcomeModalContent>
		</DialogPrimitive.Root>
	);
}
