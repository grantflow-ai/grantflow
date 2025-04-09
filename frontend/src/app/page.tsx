/* eslint-disable @typescript-eslint/require-await */
"use server";

import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { GradientBackground } from "@/components/landing-page/backgrounds";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { NavHeader } from "@/components/landing-page/nav-header";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import { LinkedIn } from "@/components/social-icons";
import { IconCalendar, IconGoAhead } from "@/components/landing-page/icons";
import { LogoDark } from "@/components/logo";
import { AppButton } from "@/components/app-button";

export default async function LandingPage() {
	return (
		<div className="flex flex-col">
			<NavHeader />
			<HeroBanner />
			<BenefitsSection />
			<EarlyAccessSection />
			<TestimonialsSection />
			<CoreFeaturesSection />
			<CTASection />
			<Footer />
		</div>
	);
}

function CTASection() {
	const content = {
		description:
			"Join leading research teams who are saving time, improving collaboration, and securing more funds with GrantFlow.ai.",
		heading: "Ready to Transform Your Grant Writing Process?",
	};

	return (
		<section aria-labelledby="cta-section" className="relative">
			<GradientBackground className="absolute inset-0 z-0" />
			<div className="relative z-10 flex w-full items-center justify-between py-20 px-30">
				<div className="flex flex-col w-fit text-white">
					<h2 className="font-heading text-[1.775rem] leading-[1]" id="cta-heading">
						{content.heading}
					</h2>
					<p className="max-w-lg mt-4 text-base font-light leading-tight">{content.description}</p>
				</div>
				<div className="flex gap-6 items-center">
					<AppButton rightIcon={<IconGoAhead />} size="lg">
						Try For Free
					</AppButton>
					<AppButton leftIcon={<IconCalendar />} size="lg" theme="light" variant="secondary">
						Schedule a Demo
					</AppButton>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer aria-labelledby="site-footer" className="bg-white relative z-0">
			<div className="flex justify-between items-center px-8 my-6">
				<LogoDark className="h-15.5" height="250" width="250" />
				<nav aria-label="footer-navigation">
					<ul className="flex gap-6 text-primary font-button">
						<li>
							<AppButton variant="link">Terms of Use</AppButton>
						</li>
						<li>
							<AppButton variant="link">Privacy Policy</AppButton>
						</li>
					</ul>
				</nav>
				<LinkedIn className="size-8" />
			</div>
		</footer>
	);
}
