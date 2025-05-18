"use server";

import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { GradientBackground } from "@/components/landing-page/backgrounds";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { IconGoAhead } from "@/components/icons";
import { AppButton } from "@/components/app-button";
import { ScrollButton } from "@/components/scroll-button";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import Link from "next/link";

const CONTENT_CTA_SECTION = {
	description:
		"Join leading research teams who are saving time, improving collaboration, and securing more funds with GrantFlow.",
	heading: "Ready to Transform Your Grant Writing Process?",
};

// page components are Server Components by default and need to be async to properly handle server-side operations
// eslint-disable-next-line @typescript-eslint/require-await
export default async function LandingPage() {
	return (
		<div className="flex flex-col">
			<HeroBanner />
			<BenefitsSection />
			<EarlyAccessSection />
			<CoreFeaturesSection />
			<TestimonialsSection />
			<CTASection />
		</div>
	);
}

function CTASection() {
	return (
		<section aria-label="cta-section" className="relative" data-testid="cta-section">
			<GradientBackground className="absolute inset-0 z-0" />
			<div className="xl:px-30 relative z-10 flex w-full flex-col items-center justify-between gap-10 px-6 py-8 md:flex-row md:p-10 lg:p-20">
				<div className="flex w-fit flex-1 flex-col text-white">
					<h2
						aria-label="cta-heading"
						className="font-heading text-2xl md:text-[1.775rem] md:leading-none"
						id="cta-heading"
					>
						{CONTENT_CTA_SECTION.heading}
					</h2>
					<p className="mt-4 max-w-lg text-xl leading-tight md:text-base md:font-light">
						{CONTENT_CTA_SECTION.description}
					</p>
				</div>
				<div className="flex w-full flex-row-reverse items-center justify-between gap-6 md:w-auto md:flex-row md:justify-end">
					<AppButton size="lg" theme="light" variant="secondary">
						<Link href="mailto:contact@grantflow.ai">Contact us</Link>
					</AppButton>
					<ScrollButton rightIcon={<IconGoAhead />} selector="waitlist" size="lg">
						Try For Free
					</ScrollButton>
				</div>
			</div>
		</section>
	);
}
