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
import { IconGoAhead } from "@/components/landing-page/icons";
import { LogoDark } from "@/components/logo";
import { AppButton } from "@/components/app-button";
import { ScrollButton } from "@/components/scroll-button";
import { IconLink } from "@/components/link-button";

const CONTENT_CTA_SECTION = {
	description:
		"Join leading research teams who are saving time, improving collaboration, and securing more funds with GrantFlow.ai.",
	heading: "Ready to Transform Your Grant Writing Process?",
};

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
	return (
		<section aria-labelledby="cta-section" className="relative">
			<GradientBackground className="absolute inset-0 z-0" />
			<div className="relative z-10 flex flex-col md:flex-row w-full items-center justify-between py-8 md:py-10 lg:py-20 px-6 md:px-10 lg:px-20 xl:px-30 gap-10">
				<div className="flex flex-1 flex-col w-fit text-white">
					<h2 className="font-heading text-2xl md:text-[1.775rem] md:leading-[1]" id="cta-heading">
						{CONTENT_CTA_SECTION.heading}
					</h2>
					<p className="max-w-lg mt-4 text-xl md:text-base md:font-light leading-tight">
						{CONTENT_CTA_SECTION.description}
					</p>
				</div>
				<div className="w-full md:w-auto flex flex-row-reverse md:flex-row gap-6 justify-between md:justify-end items-center">
					<AppButton size="lg" theme="light" variant="secondary">
						Contact us
					</AppButton>
					<ScrollButton rightIcon={<IconGoAhead />} selector="waitlist" size="lg">
						Try For Free
					</ScrollButton>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer aria-labelledby="site-footer" className="bg-white relative z-0">
			<div className="md:hidden flex flex-col px-6 py-2">
				<nav aria-label="footer-navigation">
					<ul className="flex flex-col items-end gap-5 my-2 text-primary font-button">
						<li>
							<AppButton className="text-lg" size="lg" variant="link">
								Terms of Use
							</AppButton>
						</li>
						<li>
							<AppButton className="text-lg" size="lg" variant="link">
								Privacy Policy
							</AppButton>
						</li>
						<li>
							<AppButton className="text-lg" size="lg" variant="link">
								Imprint
							</AppButton>
						</li>
					</ul>
				</nav>
				<div className="flex w-full justify-between items-center">
					<LogoDark className="h-15.5" height="200" width="200" />
					<IconLink
						href="https://www.linkedin.com/company/grantflowai/"
						icon={<LinkedIn className="size-9.5" />}
					></IconLink>
				</div>
			</div>
			<div className="hidden md:flex md:flex-row justify-between items-center px-8 mx-2 my-6">
				<LogoDark className="h-15.5" height="250" width="250" />
				<nav aria-label="footer-navigation">
					<ul className="flex gap-5 text-primary font-button">
						<li>
							<AppButton variant="link">Terms of Use</AppButton>
						</li>
						<li>
							<AppButton variant="link">Privacy Policy</AppButton>
						</li>
						<li>
							<AppButton variant="link">Imprint</AppButton>
						</li>
					</ul>
				</nav>
				<IconLink
					href="https://www.linkedin.com/company/grantflowai/"
					icon={<LinkedIn className="size-9.5" />}
				></IconLink>
			</div>
		</footer>
	);
}
