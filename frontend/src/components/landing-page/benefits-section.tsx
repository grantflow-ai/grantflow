import Image from "next/image";
import { HowItWorksCard } from "@/components/landing-page/howitworks-card";
import { IconBenefitFirst, IconBenefitSecond } from "@/components/landing-page/icons";
import { ScaleElement } from "@/components/landing-page/scale-element";
import { ScrollFadeElement } from "@/components/landing-page/scroll-fade-element";
import { cn } from "@/lib/utils";

const benefitsCardHeader = "font-heading font-medium text-stone-800 text-3xl md:text-4xl";
const benefitsCardBackground = "bg-stone-50/60";
const benefitsCardBorder = "border-2 border-primary/70 rounded";

const CONTENT = {
	benefits: [
		{
			badge: "Save time!",
			badgeIcon: IconBenefitFirst,
			description:
				"As a PI, you balance lab leadership, publishing demands, and funding pressure. GrantFlow converts your documents into proposal drafts, allowing you to focus on your innovative research.",
			heading: "More Time on Grant Writing, Less on Research?",
		},
		{
			badge: "Collaborate smarter!",
			badgeIcon: IconBenefitSecond,
			description:
				"Coordinating with students and admins can slow things. GrantFlow offers a workspace for proposals, tracking progress, and keeping everyone aligned without endless emails.",
			heading: "One Place for Your Entire Grant Team",
		},
	],
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
		<section aria-label="benefits-section" className="relative w-full bg-white" data-testid="benefits-section">
			<div className="absolute inset-0 z-0">
				<Image
					alt="background"
					aria-hidden="true"
					className="size-full object-none xl:object-cover"
					height={0}
					priority
					src="/assets/landing-bg-pattern.svg"
					style={{ height: "auto", width: "100%" }}
					width={0}
				/>
			</div>
			<div className="pb-15 xl:px-30 relative z-10 flex w-full flex-col items-center px-4 pt-8 text-center md:px-10 md:pt-12 lg:px-20 lg:pt-16 xl:pt-20">
				<ScrollFadeElement className="mx-auto">
					<h2 className={benefitsCardHeader} id="benefits-heading">
						{CONTENT.heading}
					</h2>
				</ScrollFadeElement>

				<div className="mb-8 mt-12 grid w-full grid-cols-1 items-start gap-y-8 text-start md:grid-cols-2 md:gap-x-10">
					{CONTENT.benefits.map((benefit, index) => (
						<ScaleElement delay={index * 0.2} key={index}>
							<BenefitsCard
								badge={benefit.badge}
								badgeIcon={benefit.badgeIcon}
								description={benefit.description}
								heading={benefit.heading}
								key={index}
							/>
						</ScaleElement>
					))}
					<HowItWorksCard
						className={cn("col-span-1 md:col-span-2", benefitsCardBackground, benefitsCardBorder)}
						headerStyle={benefitsCardHeader}
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
			className={cn(
				"size-full text-stone-800 py-8 px-6 md:px-[22px]",
				benefitsCardBackground,
				benefitsCardBorder,
			)}
		>
			<div className="bg-background inline-flex items-center gap-1 rounded-2xl px-2.5 py-0.5 text-white">
				<BadgeIcon className="size-5 md:size-4" />
				<span className="font-button align-bottom md:text-sm">{badge}</span>
			</div>
			<h3 className="font-heading my-3 text-2xl font-medium md:my-2">{heading}</h3>
			<p className="max-w-xl text-xl leading-tight md:text-base">{description}</p>
		</article>
	);
}
