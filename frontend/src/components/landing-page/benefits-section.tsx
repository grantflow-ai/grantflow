import { LucideIcon, Timer, Users } from "lucide-react";
import { PatternedBackground } from "./backgrounds";
import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

const benefitsCardHeader = "font-heading font-medium text-stone-800 text-4xl";
const benefitsCardBackground = "bg-stone-50/60";
const benefitsCardBorder = "border-2 border-primary/70 rounded";

export function BenefitsSection() {
	const content = {
		benefits: [
			{
				badge: "Save time!",
				badgeIcon: Timer,
				description:
					"As a PI, you're balancing lab leadership, publishing demands, and the constant pressure to secure funding. Much of the grant writing process is not only time-consuming, it pulls your focus away from advancing groundbreaking research. GrantFlow.ai seamlessly converts your documents into proposal drafts, freeing you to focus solely on highlighting what makes your research innovative.",
				heading: "More Time on Grant Writing, Less on Research?",
			},
			{
				badge: "Collaborate smarter!",
				badgeIcon: Users,
				description:
					"Coordinating with students, administrators, and co-investigators can slow everything down. GrantFlow gives your team a shared workspace to work on proposals efficiently, track progress, and keep everyone aligned without endless email threads or version chaos.",
				heading: "One Place for Your Entire Grant Team",
			},
		],
		description:
			"GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow. From generating draft proposals in one quick session instead of weeks to managing documents effortlessly, our AI does the heavy lifting, so you can focus on your research.",
		heading: "Simplify Grant Applications with AI-Powered tools",
		stepByStepProcess: {
			step1: "Describe Your Research",
			step2: "Upload Your Research Database",
			step3: "Invite Your Colleagues to Work With You",
			step4: "Generate Your Proposal with AI",
		},
	};

	return (
		<section aria-labelledby="benefits-section" className="relative w-full bg-white">
			<PatternedBackground aria-hidden="true" className="absolute inset-0 z-0 w-full h-auto" />
			<div className="relative z-10 flex flex-col items-center text-center pt-20 pb-15 px-30">
				<h2 className={benefitsCardHeader} id="benefits-heading">
					{content.heading}
				</h2>
				<p className="m-3 text-xl text-stone-800" id="benefits-description">
					{content.description}
				</p>
				<div className="grid grid-cols-2 gap-6 w-full items-start text-start my-8">
					{content.benefits.map((benefit, index) => (
						<BenefitsCard
							badge={benefit.badge}
							badgeIcon={benefit.badgeIcon}
							description={benefit.description}
							heading={benefit.heading}
							key={index}
						/>
					))}
					<HowItWorksCard className="col-span-2" heading="How It Works?" steps={content.stepByStepProcess} />
				</div>
			</div>
		</section>
	);
}

function BenefitsCard({
	badge,
	badgeIcon: Icon,
	description,
	heading,
}: {
	badge: string;
	badgeIcon: LucideIcon;
	description: string;
	heading: string;
}) {
	return (
		<article className={cn("size-full text-stone-800 py-7 px-5", benefitsCardBackground, benefitsCardBorder)}>
			<div className="inline-flex items-center bg-background rounded-2xl px-2 text-white gap-1">
				<Icon className="size-3" />
				<span className="font-button font-light align-bottom text-sm">{badge}</span>
			</div>
			<h3 className="font-heading font-semibold text-2xl my-2">{heading}</h3>
			<p className="leading-tight max-w-xl">{description}</p>
		</article>
	);
}

function HowItWorksCard({
	className,
	heading,
	steps,
	...props
}: {
	heading: string;
	steps: { step1: string; step2: string; step3: string; step4: string };
} & HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"w-full h-auto p-10 flex flex-col items-center justify-center",
				className,
				benefitsCardBackground,
				benefitsCardBorder,
			)}
			{...props}
		>
			<h2 className={cn(benefitsCardHeader, "font-bold m-4")}>{heading}</h2>
			<div className="grid grid-cols-4 my-8 p-2 gap-x-20">
				{Object.entries(steps).map(([, content], index) => (
					<TimelineStep key={index} label={content} />
				))}
			</div>
		</div>
	);
}

function StepIndicator() {
	return (
		<div className="inline-flex items-center justify-center rounded-full p-[0.1rem] border-2 border-background">
			<div className="size-5 bg-background rounded-full" />
		</div>
	);
}

function TimelineStep({ label }: { label: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center">
			<StepIndicator />
			<p className="font-heading font-bold text-background text-center text-2xl mt-6">{label}</p>
		</div>
	);
}
