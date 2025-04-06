import { GradientBackground } from "./backgrounds";
import { WaitlistForm } from "./waitlist-form";
import {
	IconEarlyAccessBenefit1,
	IconEarlyAccessBenefit2,
	IconEarlyAccessBenefit3,
	IconEarlyAccessBenefit4,
} from "./icons";
import React from "react";

export function EarlyAccessSection() {
	return (
		<section aria-labelledby="early-access-section" className="relative">
			<GradientBackground className="absolute inset-0 z-0" />
			<div className="relative z-10 flex flex-col py-20 px-30">
				<div
					className="max-w-fit bg-white rounded-full px-2 pt-[0.125rem] text-background text-sm"
					id="early-access-badge"
				>
					Early Access Registration Now Open!
				</div>
				<h2 className="font-heading text-4xl mt-4" id="early-access-heading">
					Save Time, Amplify Your Impact.
				</h2>
				<p className="mt-1 font-light" id="early-access-description">
					Be amongst the first to experience GrantFlow. Sign up now to unlock exclusive features, provide
					valuable features, and enjoy priority support.
				</p>
				<BenefitsAndWaitlistForm />
			</div>
		</section>
	);
}

function BenefitsAndWaitlistForm() {
	const earlyAccessBenefits = [
		{
			description: "Be the first to explore ur most advanced, AI-powered tools.",
			heading: "Exclusive Features",
			icon: IconEarlyAccessBenefit1,
		},
		{
			description: "Your feedback will directly shape how Grantflow evolves.",
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
	];

	return (
		<div className="flex bg-violet-300/20 rounded mt-8 px-10 py-7">
			<section className="flex-1" id="early-access-form-and-benefits">
				<h3 className="font-heading text-3xl" id="benefits-list-header">
					Exclusive Early Access Benefits:
				</h3>
				<ul className="flex flex-wrap justify-start mt-8 p-4 gap-10">
					{earlyAccessBenefits.map((benefits, index) => (
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
			<aside aria-label="waitlist-form" className="shrink-0 py-2 ps-4 my-6 text-2xl">
				<h3 className="font-heading ">Join GrantFlow.ai Waitlist</h3>
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
		<article className="w-[9rem] shrink-0" id="early-access-benefits-card">
			<BadgeIcon className="size-5" />
			<h3 className="font-heading mt-2 mb-1">{heading}</h3>
			<p className="font-light leading-tight text-sm">{description}</p>
		</article>
	);
}
