import { PatternedBackground } from "./backgrounds";
import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";
import { IconBenefitFirst, IconBenefitSecond } from "@/components/landing-page/icons";

const benefitsCardHeader = "font-heading font-medium text-stone-800 text-3xl md:text-4xl";
const benefitsCardBackground = "bg-stone-50/60";
const benefitsCardBorder = "border-2 border-primary/70 rounded";

const CONTENT = {
	benefits: [
		{
			badge: "Save time!",
			badgeIcon: IconBenefitFirst,
			description:
				"As a PI, you're balancing lab leadership, publishing demands, and the constant pressure to secure funding. Much of the grant writing process is not only time-consuming, it pulls your focus away from advancing groundbreaking research. GrantFlow.ai seamlessly converts your documents into proposal drafts, freeing you to focus solely on highlighting what makes your research innovative.",
			heading: "More Time on Grant Writing, Less on Research?",
		},
		{
			badge: "Collaborate smarter!",
			badgeIcon: IconBenefitSecond,
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

export function BenefitsSection() {
	return (
		<section aria-labelledby="benefits-section" className="relative w-full bg-white overflow-hidden">
			<div className="absolute inset-0 flex items-center justify-center">
				<PatternedBackground aria-hidden="true" className="absolute w-full h-full object-cover object-center" />
			</div>
			<div className="relative z-10 flex flex-col items-center text-center pt-8 md:pt-12 lg:pt-16 xl:pt-20 pb-5 px-4 md:px-10 lg:px-20 xl:px-30">
				<h2 className={benefitsCardHeader} id="benefits-heading">
					{CONTENT.heading}
				</h2>
				<p className="m-3 text-xl text-stone-800" id="benefits-description">
					{CONTENT.description}
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-x-6 lg:gap-x-10 xl:gap-x-20 w-full items-start text-start my-8">
					{CONTENT.benefits.map((benefit, index) => (
						<BenefitsCard
							badge={benefit.badge}
							badgeIcon={benefit.badgeIcon}
							description={benefit.description}
							heading={benefit.heading}
							key={index}
						/>
					))}
					<HowItWorksCard
						className="col-span-1 md:col-span-2"
						heading="How It Works?"
						steps={CONTENT.stepByStepProcess}
					/>
				</div>
			</div>
		</section>
	);
}

function BenefitsCard({
	badge,
	badgeIcon: BadgeIcon,
	description,
	heading,
}: {
	badge: string;
	badgeIcon: React.FC<React.SVGProps<SVGSVGElement>>;
	description: string;
	heading: string;
}) {
	return (
		<article
			className={cn("size-full text-stone-800 py-7 px-6 md:px-5", benefitsCardBackground, benefitsCardBorder)}
		>
			<div className="inline-flex items-center bg-background rounded-2xl px-2.5 py-0.5 text-white gap-1">
				<BadgeIcon className="size-5 md:size-4" />
				<span className="font-button font-light align-bottom md:text-sm">{badge}</span>
			</div>
			<h3 className="font-heading font-semibold text-2xl my-3 md:my-2">{heading}</h3>
			<p className="leading-tight max-w-xl text-xl md:text-base">{description}</p>
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
				"w-full h-auto flex px-10 py-6 md:py-10 flex-col items-center justify-center",
				className,
				benefitsCardBackground,
				benefitsCardBorder,
			)}
			{...props}
		>
			<h2 className={cn(benefitsCardHeader, "font-bold md:m-4")}>{heading}</h2>
			<div className="grid grid-cols-1 md:grid-cols-4 w-full my-8 p-2 gap-y-12 md:gap-x-20 relative">
				<div className="md:hidden absolute left-5 top-4 bottom-0 border-l-2 border-dashed border-background/30 h-7/8 z-0" />
				<div className="hidden md:block absolute top-5.5 md:left-17 lg:left-23 xl:left-28 right-0 h-[0.15rem] border-t-2 border-dashed border-background/30 md:w-[calc(100%-8.5rem)] lg:w-[calc(100%-11.5rem)] xl:w-[calc(100%-14rem)] z-0" />
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
		<div className="flex flex-row md:flex-col items-center text-start md:text-center">
			<div className="flex place-items-center me-6 md:me-0 md:mb-6 relative z-10">
				<StepIndicator />
			</div>
			<p className="font-heading font-bold text-background text-2xl">{label}</p>
		</div>
	);
}
