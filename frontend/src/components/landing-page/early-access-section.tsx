import { GradientBackground } from "./backgrounds";
import { WaitlistForm } from "./waitlist-form";
import {
	IconEarlyAccessBenefit1,
	IconEarlyAccessBenefit2,
	IconEarlyAccessBenefit3,
	IconEarlyAccessBenefit4,
} from "./icons";
import React from "react";

const SECTION_HEADERS = {
	badge: "Early Access Registration Now Open!",
	description:
		"Be among the first to experience GrantFlow.ai. Sign up now to unlock exclusive features, provide valuable feedback, and enjoy priority support.",
	heading: "Save Time, Amplify Your Impact.",
};

const CONTENT_BENEFITS = {
	earlyAccessBenefits: [
		{
			description: "Be the first to explore our most advanced, AI-powered tools.",
			heading: "Exclusive Features",
			icon: IconEarlyAccessBenefit1,
		},
		{
			description: "Your feedback will directly shape how GrantFlow.ai evolves.",
			heading: "Influence the Future",
			icon: IconEarlyAccessBenefit2,
		},
		{
			description: "Get dedicated onboarding and hands-on assistance from our team.",
			heading: "Priority Support",
			icon: IconEarlyAccessBenefit3,
		},
		{
			description: "Create and generate your first full grant application for FREE!",
			heading: "Free Application",
			icon: IconEarlyAccessBenefit4,
		},
	],
	formHeading: "Join GrantFlow.ai Waitlist",
	listHeading: "Exclusive Early Access Benefits:",
};

export function EarlyAccessSection() {
	return (
		<section aria-labelledby="early-access-section" className="relative" id="waitlist">
			<GradientBackground className="hidden md:block md:absolute inset-0 z-0" />
			<GradientBackground className="absolute md:hidden inset-0 z-0" position="bottom-left" />
			<div className="relative z-10 flex flex-col py-10 md:py-12 lg:py-15 xl:py-20 px-4 md:px-10 lg:px-20 xl:px-30">
				<div
					className="max-w-fit bg-white rounded-full px-2 pt-[0.125rem] text-background text-lg md:text-sm"
					id="early-access-badge"
				>
					{SECTION_HEADERS.badge}
				</div>
				<h2
					className="font-heading text-5xl leading-14 md:text-4xl md:leading-10 mt-4 md:mt-3"
					id="early-access-heading"
				>
					{SECTION_HEADERS.heading}
				</h2>
				<p className="mt-1 antialiased text-xl md:text-white/80" id="early-access-description">
					{SECTION_HEADERS.description}
				</p>
				<BenefitsAndWaitlistForm />
			</div>
		</section>
	);
}

function BenefitsAndWaitlistForm() {
	return (
		<div className="flex flex-col md:flex-row bg-violet-200/15 rounded mt-10 md:mt-7 ps-7 md:px-11 py-7 md:pe-7 gap-8 md:gap-12">
			<section className="flex-1 justify-start" id="early-access-form-and-benefits">
				<h3 className="font-heading text-[1.5rem] md:text-[1.75rem]" id="benefits-list-header">
					{CONTENT_BENEFITS.listHeading}
				</h3>
				<ul className="flex flex-wrap justify-start mt-7 py-3 ps-3 md:p-3 gap-4 gap-y-12 md:gap-12">
					{/*grid grid-cols-2 md:grid-cols-4  */}
					{CONTENT_BENEFITS.earlyAccessBenefits.map((benefits, index) => (
						<li
							className="w-[calc(50%-1rem)] sm:w-[calc(45%-1rem)] md:w-[calc(40%-1rem)] lg:w-[calc(30%-1rem)] xl:w-[calc(20%-1rem)]"
							key={index}
						>
							<EarlyAccessBenefitsCard
								BadgeIcon={benefits.icon}
								description={benefits.description}
								heading={benefits.heading}
							/>
						</li>
					))}
				</ul>
			</section>
			<aside aria-label="waitlist-form" className="shrink-0 me-7 md:me-0 text-2xl">
				<h3 className="font-heading ">{CONTENT_BENEFITS.formHeading}</h3>
				<WaitlistForm />
			</aside>
		</div>
	);
}

function EarlyAccessBenefitsCard({
	BadgeIcon,
	description,
	heading,
}: {
	BadgeIcon: React.FC<React.SVGProps<SVGSVGElement>>;
	description: string;
	heading: string;
}) {
	return (
		<article id="early-access-benefits-card">
			<BadgeIcon className="size-6 md:size-5" />
			<h3 className="font-heading mt-4 md:mt-2 mb-1 text-xl md:text-base">{heading}</h3>
			<p className="text-white/80 md:text-white md:font-light leading-tight text-lg md:text-sm">{description}</p>
		</article>
	);
}
