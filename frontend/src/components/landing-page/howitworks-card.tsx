"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { TutorialVideo } from "./tutorial-video";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			duration: 1,
			ease: "easeInOut" as const,
			staggerChildren: 0.4,
		},
	},
};

const headingVariants = {
	hidden: { opacity: 0, y: -10 },
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeOut" as const,
		},
		y: 0,
	},
};

const stepIndicatorVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			delay: 0.1,
			duration: 0.4,
			ease: "easeOut" as const,
		},
	},
};

const textVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			delay: 0.1,
			duration: 0.4,
			ease: "easeOut" as const,
		},
	},
};

const timelineVariants = {
	hidden: { originX: 0, scaleX: 0 },
	visible: {
		scaleX: 1,
		transition: {
			duration: 0.8,
			ease: "easeInOut" as const,
		},
	},
};

const timelineStepGroupVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeOut" as const,
		},
		y: 0,
	},
};

export function HowItWorksCard({
	className,
	headerStyle,
	heading,
	steps,
}: {
	headerStyle: string;
	heading: string;
	steps: { step1: string; step2: string; step3: string; step4: string };
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<motion.div
			className={cn(
				"w-full h-auto flex px-5 lg:px-10 py-5 lg:py-15 flex-col items-center justify-center",
				className,
			)}
			initial="visible"
			variants={containerVariants}
			whileInView="visible"
		>
			<motion.h2 className={cn(headerStyle, "font-medium md:m-4")} variants={headingVariants}>
				{heading}
			</motion.h2>
			<div className="relative my-8 grid w-full grid-cols-1 gap-y-12 p-2 md:grid-cols-4 md:gap-x-20">
				<div className="border-background/15 h-7/8 absolute bottom-0 left-5 top-4 z-0 border-l-2 border-dashed md:hidden" />
				<motion.div
					className="border-background/15 md:left-18 lg:left-25 xl:left-29 absolute right-0 top-5 z-0 hidden h-[0.15rem] border-t-2 border-dashed md:block md:w-[calc(100%-9.5rem)] lg:w-[calc(100%-12.5rem)] xl:w-[calc(100%-15rem)]"
					variants={timelineVariants}
				/>

				{Object.entries(steps).map(([, content], index) => (
					<AnimatedTimelineStep key={index} label={content} />
				))}
			</div>
			<div className="lg:max-w-1/2 mt-12 flex w-full items-center justify-center">
				<TutorialVideo />
			</div>
		</motion.div>
	);
}

function AnimatedTimelineStep({ label }: { label: React.ReactNode }) {
	return (
		<motion.div
			className="flex flex-row items-center text-start md:flex-col md:text-center"
			variants={timelineStepGroupVariants}
		>
			<div className="relative z-10 me-6 flex place-items-center md:mb-6 md:me-0">
				<StepIndicator />
			</div>
			<motion.p className="font-heading text-background font-medium" variants={textVariants}>
				{label}
			</motion.p>
		</motion.div>
	);
}

function StepIndicator() {
	return (
		<div className="border-background inline-flex items-center justify-center rounded-full border-2 p-[0.1rem]">
			<motion.div className="bg-background size-5 rounded-full" variants={stepIndicatorVariants} />
		</div>
	);
}
