"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PROGRESS_BAR_STEPS } from "@/constants";
import { PagePath } from "@/enums";
import { useUserStore } from "@/stores/user-store";
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
		<Dialog onOpenChange={(isOpen) => !isOpen && handleClose()} open={open}>
			<DialogContent className="flex max-w-[954px] flex-col gap-16 overflow-hidden rounded-sm border border-primary bg-white px-0 pb-8 pt-0">
				<DialogHeader className="relative flex h-[152px] w-full items-center justify-center overflow-hidden rounded-t-sm bg-preview-bg">
					<div className="absolute -left-32 top-40 size-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_var(--color-primary)_0%,_transparent_70%)] opacity-80" />
					<ProgressBar currentStep={step} />
				</DialogHeader>
				<section className="flex w-full justify-between px-10">
					<DialogTitle>
						<h2 className="text-4xl font-medium text-app-black font-heading">
							Welcome to <br /> GrantFlow!
						</h2>
					</DialogTitle>

					<DialogDescription className="flex w-[597px] flex-col gap-10">
						<div className="flex flex-col gap-4">
							<p className="text-base font-normal text-app-black font-body">
								<span className="font-semibold">GrantFlow</span> was built for researchers, designed to
								save dozens of hours and bring you closer to submission, quickly and efficiently.
							</p>
							<p className="text-base font-normal text-app-black font-body">
								Powered by AI, the system will generate a draft application tailored to your needs based
								on the materials and information you provide. The more accurate and detailed your input,
								the closer the result will be to what you need.
							</p>
						</div>
						<article className="flex gap-1 rounded-lg border border-app-slate-blue bg-light-gray p-2">
							<div className="size-4">
								<AlertCircle className="text-app-gray-700 size-4" />
							</div>
							<p className="text-sm font-normal text-app-black font-body">
								Keep in mind that AI has limitations and may occasionally make mistakes. Always review
								and refine the output using the editor.
							</p>
						</article>
					</DialogDescription>
				</section>
				<footer className="flex w-full items-center justify-between px-10">
					<AppButton className="w-28 px-4 py-2" onClick={handleClose} variant="secondary">
						Later
					</AppButton>
					<AppButton className="px-4 py-2" onClick={handleStartApplication} variant="primary">
						Start New Application
					</AppButton>
				</footer>
			</DialogContent>
		</Dialog>
	);
}

