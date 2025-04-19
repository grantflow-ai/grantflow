/* eslint-disable @typescript-eslint/require-await */
"use server";

import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { GradientBackground } from "@/components/landing-page/backgrounds";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { NavHeader } from "@/components/landing-page/nav-header";
import { IconGoAhead } from "@/components/landing-page/icons";
import { LogoDark } from "@/components/logo";
import { AppButton } from "@/components/app-button";
import { LinkedIn } from "@/components/landing-page/social-icons";
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
			{}
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
			<div className="xl:px-30 relative z-10 flex w-full flex-col items-center justify-between gap-10 px-6 py-8 md:flex-row md:p-10 lg:p-20">
				<div className="flex w-fit flex-1 flex-col text-white">
					<h2 className="font-heading text-2xl md:text-[1.775rem] md:leading-none" id="cta-heading">
						{CONTENT_CTA_SECTION.heading}
					</h2>
					<p className="mt-4 max-w-lg text-xl leading-tight md:text-base md:font-light">
						{CONTENT_CTA_SECTION.description}
					</p>
				</div>
				<div className="flex w-full flex-row-reverse items-center justify-between gap-6 md:w-auto md:flex-row md:justify-end">
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
		<footer aria-labelledby="site-footer" className="relative z-0 bg-white">
			<div className="flex flex-col px-6 py-2 md:hidden">
				<nav aria-label="footer-navigation">
					<ul className="text-primary font-button my-2 flex flex-col items-end gap-5">
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
				<div className="flex w-full items-center justify-between">
					<LogoDark className="h-15.5" height="200" width="200" />
					<IconLink
						href="https://www.linkedin.com/company/grantflowai/"
						icon={<LinkedIn className="size-9.5" />}
					></IconLink>
				</div>
			</div>
			<div className="mx-2 my-6 hidden items-center justify-between px-8 md:flex md:flex-row">
				<LogoDark className="h-15.5" height="250" width="250" />
				<nav aria-label="footer-navigation">
					<ul className="text-primary font-button flex gap-5">
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
