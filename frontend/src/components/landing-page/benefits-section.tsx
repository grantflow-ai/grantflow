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
		<section aria-labelledby="benefits-section" className="relative w-full overflow-hidden bg-white">
			<div className="absolute inset-0 flex items-center justify-center">
				<PatternedBackground aria-hidden="true" className="absolute size-full object-cover object-center" />
			</div>
			<div className="xl:px-30 relative z-10 flex flex-col items-center px-4 pb-15 pt-8 text-center md:px-10 md:pt-12 lg:px-20 lg:pt-16 xl:pt-20">
				<h2 className={benefitsCardHeader} id="benefits-heading">
					{CONTENT.heading}
				</h2>
				<p className="m-3 text-xl text-stone-800" id="benefits-description">
					{CONTENT.description}
				</p>
				<div className="my-8 grid w-full grid-cols-1 items-start gap-y-8 text-start md:grid-cols-2 md:gap-x-10">
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
			<div className="bg-background inline-flex items-center gap-1 rounded-2xl px-2.5 py-0.5 text-white">
				<BadgeIcon className="size-5 md:size-4" />
				<span className="font-button align-bottom font-light md:text-sm">{badge}</span>
			</div>
			<h3 className="font-heading my-3 text-2xl font-semibold md:my-2">{heading}</h3>
			<p className="max-w-xl text-xl leading-tight md:text-base">{description}</p>
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
			<div className="relative my-8 grid w-full grid-cols-1 gap-y-12 p-2 md:grid-cols-4 md:gap-x-20">
				<div className="md:hidden border-background/15 h-7/8 absolute bottom-0 left-5 top-4 z-0 border-l-2 border-dashed" />
				<div className="absolute right-0 z-0 hidden top-5 border-background/15 h-[0.15rem] border-t-2 border-dashed md:block md:left-18 md:w-[calc(100%-9.5rem)] lg:left-25 lg:w-[calc(100%-12.5rem)] xl:left-29 xl:w-[calc(100%-15rem)]" />
				{Object.entries(steps).map(([, content], index) => (
					<TimelineStep key={index} label={content} />
				))}
			</div>
		</div>
	);
}

function StepIndicator() {
	return (
		<div className="border-background inline-flex items-center justify-center rounded-full border-2 p-[0.1rem]">
			<div className="bg-background size-5 rounded-full" />
		</div>
	);
}

function TimelineStep({ label }: { label: React.ReactNode }) {
	return (
		<div className="flex flex-row items-center text-start md:flex-col md:text-center">
			<div className="relative z-10 me-6 flex place-items-center md:mb-6 md:me-0">
				<StepIndicator />
			</div>
			<p className="font-heading text-background text-2xl font-bold">{label}</p>
		</div>
	);
}
