import { PatternedBackground, PatternedBackgroundMobile } from "@/components/landing-page/backgrounds";
import { cn } from "@/lib/utils";
import { IconBenefitFirst, IconBenefitSecond } from "@/components/landing-page/icons";
import { ScrollFadeElement } from "@/components/landing-page/scroll-fade-element";
import { ScaleElement } from "@/components/landing-page/scale-element";
import { HowItWorksCard } from "@/components/landing-page/howitworks-card";

const benefitsCardHeader = "font-heading font-medium text-stone-800 text-3xl md:text-4xl";
const benefitsCardBackground = "bg-stone-50/60";
const benefitsCardBorder = "border-2 border-primary/70 rounded";

const CONTENT = {
	benefits: [
		{
			badge: "Save time!",
			badgeIcon: IconBenefitFirst,
			description:
				"As a PI, you're balancing lab leadership, publishing demands, and the constant pressure to secure funding. Much of the grant writing process is not only time-consuming, it pulls your focus away from advancing groundbreaking research. GrantFlow seamlessly converts your documents into proposal drafts, freeing you to focus solely on highlighting what makes your research innovative.",
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
		"GrantFlow transforms the complex grant application process into a fast, intelligent workflow. From generating draft proposals in one quick session instead of weeks to managing documents effortlessly, our AI does the heavy lifting, so you can focus on your research.",
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
		<section aria-label="benefits-section" className="relative w-full bg-white">
			<div className="absolute inset-0 z-0 hidden sm:block">
				<PatternedBackground aria-hidden="true" />
			</div>
			<div className="absolute inset-0 z-0 sm:hidden opacity-50">
				<PatternedBackgroundMobile aria-hidden="true" />
			</div>
			<div className="relative flex flex-col w-full z-10 items-center text-center px-4 pb-15 pt-8 md:px-10 md:pt-12 lg:px-20 xl:px-30 lg:pt-16 xl:pt-20">
				<ScrollFadeElement className="mx-auto">
					<h2 className={benefitsCardHeader} id="benefits-heading">
						{CONTENT.heading}
					</h2>
				</ScrollFadeElement>

				<ScrollFadeElement className="mx-auto" delay={0.1}>
					<p className="m-3 text-xl text-stone-800" id="benefits-description">
						{CONTENT.description}
					</p>
				</ScrollFadeElement>

				<div className="my-8 grid w-full grid-cols-1 items-start gap-y-8 text-start md:grid-cols-2 md:gap-x-10">
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
