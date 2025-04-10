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
		<section aria-labelledby="early-access-section" className="relative">
			<GradientBackground className="absolute inset-0 z-0" />
			<div className="relative z-10 flex flex-col py-20 px-30">
				<div
					className="max-w-fit bg-white rounded-full px-2 pt-[0.125rem] text-background text-sm"
					id="early-access-badge"
				>
					{SECTION_HEADERS.badge}
				</div>
				<h2 className="font-heading text-4xl mt-3" id="early-access-heading">
					{SECTION_HEADERS.heading}
				</h2>
				<p className="mt-1 antialiased text-white/80" id="early-access-description">
					{SECTION_HEADERS.description}
				</p>
				<BenefitsAndWaitlistForm />
			</div>
		</section>
	);
}

function BenefitsAndWaitlistForm() {
	return (
		<div className="flex bg-violet-200/15 rounded mt-7 px-11 py-7">
			<section className="flex-1" id="early-access-form-and-benefits">
				<h3 className="font-heading text-[1.75rem]" id="benefits-list-header">
					{CONTENT_BENEFITS.listHeading}
				</h3>
				<ul className="flex flex-wrap justify-start mt-7 p-3 gap-12">
					{CONTENT_BENEFITS.earlyAccessBenefits.map((benefits, index) => (
						<li key={index}>
							<EarlyAccessBenefitsCard
								BadgeIcon={benefits.icon}
								description={benefits.description}
								heading={benefits.heading}
							/>
						</li>
					))}
				</ul>
			</section>
			<aside aria-label="waitlist-form" className="shrink-0 text-2xl">
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
		<article className="max-w-[8.5rem] shrink-0" id="early-access-benefits-card">
			<BadgeIcon className="size-5" />
			<h3 className="font-heading mt-2 mb-1">{heading}</h3>
			<p className="font-light leading-tight text-sm">{description}</p>
		</article>
	);
}
