"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog, AppDialogContent, AppDialogDescription, AppDialogHeader, AppDialogTitle } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { PROGRESS_BAR_STEPS } from "@/constants";

export default function WelcomeModal() {
	const [open, setOpen] = useState(true);
	const [step, setStep] = useState(1);

	useEffect(() => {
		const interval = setInterval(() => {
			setStep((prev) => (prev < PROGRESS_BAR_STEPS.length ? prev + 1 : 1));
		}, 2000);

		const hasVisited = localStorage.getItem("hasVisitedWelcomeModal");
		if (!hasVisited) {
			setOpen(true);
			localStorage.setItem("hasVisitedWelcomeModal", "true");
		}

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<AppDialog onOpenChange={setOpen} open={open}>
			<AppDialogContent className="flex w-full max-w-[954px] flex-col gap-16 overflow-hidden rounded-sm border border-[#1f13f8cf] bg-white px-0 pb-8 pt-0">
				<AppDialogHeader className="relative flex h-[152px] w-full items-center justify-center overflow-hidden rounded-t-sm bg-[#FAF9FB]">
					<div className="absolute -left-32 top-40 size-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_#1E13F8_0%,_transparent_70%)] opacity-80" />
					<ProgressBar step={step} />
				</AppDialogHeader>
				<section className=" flex w-full justify-between px-10">
					<AppDialogTitle>
						<h2 className="text-4xl font-medium text-black ">
							Welcome to <br /> GrantFlow!
						</h2>
					</AppDialogTitle>

					<AppDialogDescription className="flex w-[597px] flex-col gap-10">
						<div className="flex flex-col gap-4">
							<p className="text-base font-normal text-black ">
								<span className="font-semibold"> GrantFlow</span> was built for researchers, designed to
								save dozens of hours and bring you closer to submission, quickly and efficiently.
							</p>
							<p className="text-base font-normal text-black ">
								Powered by AI, the system will generate a draft application tailored to your needs based
								on the materials and information you provide. The more accurate and detailed your input,
								the closer the result will be to what you need.
							</p>
						</div>
						<article className="flex gap-1 rounded-lg border border-app-slate-blue bg-light-gray p-2">
							<div className="size-4">
								<AlertCircle className="text-gray-700 size-4" />
							</div>
							<p className="text-sm font-normal text-black ">
								Keep in mind that AI has limitations and may occasionally make mistakes. Always review
								and refine the output using the editor.
							</p>
						</article>
					</AppDialogDescription>
				</section>
				<footer className="flex w-full items-center justify-between px-10">
					<AppButton
						className="w-28  px-4 py-2 "
						onClick={() => {
							setOpen(false);
						}}
						variant="secondary"
					>
						Later
					</AppButton>
					<AppButton
						className="  px-4 py-2 "
						onClick={() => {
							setOpen(false);
						}}
						variant="primary"
					>
						Start New Application
					</AppButton>
				</footer>
			</AppDialogContent>
		</AppDialog>
	);
}

function ProgressBar({ step }: { step: number }) {
	return (
		<figure className="flex flex-col items-center justify-center gap-4">
			<main className="flex items-center">
				{PROGRESS_BAR_STEPS.map((_, index) => (
					<ProgressStep index={index} key={index} step={step} />
				))}
			</main>
			<main className="flex w-[839px] items-center justify-between">
				{PROGRESS_BAR_STEPS.map((label, index) => (
					<ProgressLabel index={index} key={index} label={label} step={step} />
				))}
			</main>
		</figure>
	);
}

function ProgressLabel({ index, label, step }: { index: number; label: string; step: number }) {
	const getTextColor = () => {
		if (index < step - 1) return "text-app-dark-blue";
		if (index === step - 1) return "text-primary";
		return "text-gray-400";
	};

	return <h5 className={`text-[11px] font-semibold ${getTextColor()}`}>{label}</h5>;
}

function ProgressLine({ index, step }: { index: number; step: number }) {
	if (index >= PROGRESS_BAR_STEPS.length - 1) return null;

	const renderLineContent = () => {
		if (index === step - 1) {
			return (
				<motion.div
					animate={{ width: "100%" }}
					className="absolute left-0 top-0 h-full bg-primary"
					initial={{ width: 0 }}
					key={`line-${index}`}
					transition={{ duration: 0.8, ease: "easeInOut" }}
				/>
			);
		}
		if (index < step - 1) {
			return <div className="absolute left-0 top-0 size-full bg-primary" />;
		}
		return null;
	};

	return <div className="relative h-px w-full overflow-hidden bg-gray-200">{renderLineContent()}</div>;
}

function ProgressStep({ index, step }: { index: number; step: number }) {
	return (
		<div className={`${index < PROGRESS_BAR_STEPS.length - 1 ? "w-[145px]" : ""} flex items-center`}>
			<ProgressStepIcon index={index} step={step} />
			<ProgressLine index={index} step={step} />
		</div>
	);
}

function ProgressStepIcon({ index, step }: { index: number; step: number }) {
	const getAnimationState = () => {
		if (index < step) return "active";
		if (index === step) return "next";
		return "inactive";
	};

	const getBorderColor = () => {
		if (index === step) return "var(--app-primary-blue)";
		if (index < step) return "transparent";
		return "#E5E7EB";
	};

	return (
		<motion.div
			animate={getAnimationState()}
			className="size-[11px] rounded-full flex justify-center items-center border"
			initial="inactive"
			style={{ borderColor: getBorderColor() }}
			transition={{ duration: 0.5 }}
			variants={{
				active: { backgroundColor: "var(--app-primary-blue)", scale: 1.1 },
				inactive: { backgroundColor: "transparent", scale: 1 },
				next: { backgroundColor: "transparent", scale: 1 },
			}}
		>
			<AnimatePresence mode="wait">{renderIconContent(index, step)}</AnimatePresence>
		</motion.div>
	);
}

function renderIconContent(index: number, step: number) {
	if (index < step) {
		return (
			<motion.div
				animate="active"
				className="flex items-center justify-center"
				exit="hidden"
				initial="hidden"
				key={`check-${index}`}
				style={{ transform: "translate(-0.5px, -0.5px)" }}
				transition={{ delay: 0.3, duration: 0.3 }}
				variants={{
					active: { opacity: 1, scale: 1 },
					hidden: { opacity: 0, scale: 0 },
				}}
			>
				<Check className="size-[7px] stroke-[5] text-white" />
			</motion.div>
		);
	}
	if (index === step) {
		return (
			<motion.div
				animate="active"
				className="size-[3.5px] rounded-full bg-primary"
				exit="hidden"
				initial="hidden"
				key={`dot-${index}`}
				style={{ transform: "translate(0, -0.5px)" }}
				transition={{ duration: 0.5 }}
				variants={{
					active: { opacity: 1, scale: 1 },
					hidden: { opacity: 0, scale: 0 },
				}}
			/>
		);
	}
	return null;
}
