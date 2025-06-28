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
		if (!hasSeenWelcomeModal) {
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
			<WelcomeModalContent className="flex max-w-[1080px] flex-col overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
				<header className="relative flex h-[152px] w-full items-center justify-center overflow-hidden bg-surface-secondary">
					<div className="absolute -left-32 top-40 size-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_var(--color-action-primary)_0%,_transparent_70%)] opacity-30" />
					<ProgressBar currentStep={step} />
				</header>
				<section className="flex w-full justify-between px-16 py-16">
					<AppDialogTitle className="flex-shrink-0">
						<h2 className="text-[48px] font-medium leading-[58px] text-text-primary font-heading">
							Welcome to
							<br />
							GrantFlow!
						</h2>
					</AppDialogTitle>

					<AppDialogDescription className="flex w-[597px] flex-col gap-10">
						<div className="flex flex-col gap-6">
							<p className="text-[16px] font-normal leading-[24px] text-text-primary font-body">
								<span className="font-semibold">GrantFlow</span> was built for researchers, designed to
								save dozens of hours and bring you closer to submission, quickly and efficiently.
							</p>
							<p className="text-[16px] font-normal leading-[24px] text-text-primary font-body">
								Powered by AI, the system will generate a draft application tailored to your needs based
								on the materials and information you provide. The more accurate and detailed your input,
								the closer the result will be to what you need.
							</p>
						</div>
						<article className="flex gap-3 rounded-lg border border-action-primary bg-surface-secondary p-4">
							<div className="size-5 flex-shrink-0 mt-0.5">
								<AlertCircle className="size-5 text-action-primary" />
							</div>
							<p className="text-[14px] font-normal leading-[21px] text-text-primary font-body">
								Keep in mind that AI has limitations and may occasionally make mistakes. Always review
								and refine the output using the editor.
							</p>
						</article>
					</AppDialogDescription>
				</section>
				<footer className="flex w-full items-center justify-between px-16 pb-16">
					<AppButton
						className="h-12 w-[112px] rounded-[6px] border border-border-primary bg-transparent px-6 py-3 text-[16px] font-medium leading-[22px] text-text-primary hover:bg-surface-secondary font-button"
						onClick={handleClose}
						variant="secondary"
					>
						Later
					</AppButton>
					<AppButton
						className="h-12 rounded-[6px] bg-action-primary px-6 py-3 text-[16px] font-medium leading-[22px] text-white hover:bg-action-primary/90 font-button"
						onClick={handleStartApplication}
						variant="primary"
					>
						Start New Application
					</AppButton>
				</footer>
			</WelcomeModalContent>
		</DialogPrimitive.Root>
	);
}
