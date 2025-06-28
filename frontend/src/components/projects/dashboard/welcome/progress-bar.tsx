"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { PROGRESS_BAR_STEPS } from "@/constants";

interface ProgressBarLabelProps {
	currentStep: number;
	index: number;
	label: string;
}

interface ProgressBarLineProps {
	currentStep: number;
	index: number;
}

interface ProgressBarProps {
	currentStep: number;
}

interface ProgressBarStepProps {
	currentStep: number;
	index: number;
	isLast: boolean;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
	return (
		<figure className="flex flex-col items-center justify-center gap-4">
			{/* Progress Bar */}
			<main className="flex items-center">
				{PROGRESS_BAR_STEPS.map((_, index) => (
					<ProgressBarStep
						currentStep={currentStep}
						index={index}
						isLast={index === PROGRESS_BAR_STEPS.length - 1}
						key={index}
					/>
				))}
			</main>

			{/* Labels */}
			<main className="flex w-[839px] items-center justify-between">
				{PROGRESS_BAR_STEPS.map((label, index) => (
					<ProgressBarLabel currentStep={currentStep} index={index} key={index} label={label} />
				))}
			</main>
		</figure>
	);
}

function ProgressBarLabel({ currentStep, index, label }: ProgressBarLabelProps) {
	const isCompleted = index < currentStep - 1;
	const isCurrent = index === currentStep - 1;

	const getLabelColor = () => {
		if (isCompleted) return "text-app-dark-blue";
		if (isCurrent) return "text-primary";
		return "text-app-gray-400";
	};

	return <h5 className={`text-[11px] font-semibold font-heading ${getLabelColor()}`}>{label}</h5>;
}

function ProgressBarLine({ currentStep, index }: ProgressBarLineProps) {
	const isAnimating = index === currentStep - 1;
	const isCompleted = index < currentStep - 1;

	return (
		<div className="relative h-px w-full overflow-hidden bg-app-gray-200">
			{isAnimating ? (
				<motion.div
					animate={{ width: "100%" }}
					className="absolute left-0 top-0 h-full bg-primary"
					initial={{ width: 0 }}
					key={`line-${index}`}
					transition={{ duration: 0.8, ease: "easeInOut" }}
				/>
			) : isCompleted ? (
				<div className="absolute left-0 top-0 size-full bg-primary" />
			) : null}
		</div>
	);
}

function ProgressBarStep({ currentStep, index, isLast }: ProgressBarStepProps) {
	const isActive = index < currentStep;
	const isCurrent = index === currentStep;

	return (
		<div className={`${isLast ? "" : "w-[145px]"} flex items-center`}>
			<motion.div
				animate={isActive ? "active" : isCurrent ? "next" : "inactive"}
				className="size-[11px] rounded-full flex justify-center items-center border"
				initial="inactive"
				style={{
					borderColor: isCurrent
						? "var(--color-primary)"
						: isActive
							? "transparent"
							: "var(--color-app-gray-200)",
				}}
				transition={{ duration: 0.5 }}
				variants={{
					active: { backgroundColor: "var(--color-primary)", scale: 1.1 },
					inactive: { backgroundColor: "transparent", scale: 1 },
					next: { backgroundColor: "transparent", scale: 1 },
				}}
			>
				<AnimatePresence mode="wait">
					{isActive ? (
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
					) : isCurrent ? (
						<motion.div
							animate="active"
							className="size-[3.5px] rounded-full bg-primary"
							exit="hidden"
							initial="hidden"
							key={`dot-${index}`}
							style={{
								transform: "translate(0, -0.5px)",
							}}
							transition={{ duration: 0.5 }}
							variants={{
								active: { opacity: 1, scale: 1 },
								hidden: { opacity: 0, scale: 0 },
							}}
						/>
					) : null}
				</AnimatePresence>
			</motion.div>

			{/* Animated Line */}
			{!isLast && <ProgressBarLine currentStep={currentStep} index={index} />}
		</div>
	);
}
