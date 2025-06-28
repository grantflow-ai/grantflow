"use server";

import Link from "next/link";

import { AppButton } from "@/components/app/buttons/app-button";
import { IconGoAhead } from "@/components/branding/icons";
import { GradientBackground } from "@/components/landing-page/backgrounds";
import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { PaymentPlans } from "@/components/landing-page/payment-plans/payment-plans";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import { ScrollButton } from "@/components/layout/navigation/scroll-button";

const CONTENT_CTA_SECTION = {
	description:
		"Join leading research teams who are saving time, improving collaboration, and securing more funding with GrantFlow",
	heading: "Ready to Transform Your Grant Writing Process?",
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async function LandingPage() {
	return (
		<div className="flex w-full flex-col">
			<HeroBanner />
			<BenefitsSection />
			<EarlyAccessSection />
			<PaymentPlans />
			<CoreFeaturesSection />
			<TestimonialsSection />
			<CTASection />
		</div>
	);
}

function CTASection() {
	return (
		<section aria-label="cta-section" className="relative w-full bg-white" data-testid="cta-section">
			<GradientBackground className="absolute inset-0 z-0" position="bottom-center" />
			<div className="xl:px-30 relative z-10 flex w-full flex-col items-center justify-between gap-10 px-6 py-8 md:flex-row md:p-10 lg:p-20">
				<div className="flex w-fit flex-1 flex-col text-white">
					<h2
						aria-label="cta-heading"
						className="font-heading text-app-black text-xl font-medium md:text-[1.75rem] md:leading-none"
						id="cta-heading"
					>
						{CONTENT_CTA_SECTION.heading}
					</h2>
					<p className="text-app-black mt-2 max-w-lg leading-tight md:mt-3">
						{CONTENT_CTA_SECTION.description}
					</p>
				</div>
				<div className="flex w-full items-center justify-between gap-6 md:w-auto  md:justify-end">
					<AppButton className="bg-white" size="lg" theme="dark" variant="secondary">
						<Link href="mailto:contact@grantflow.ai">Contact us</Link>
					</AppButton>
					<ScrollButton
						desktopTargetId="waitlist"
						mobileTargetId="waitlist-form-container"
						offset={10}
						rightIcon={<IconGoAhead />}
						size="lg"
					>
						Secure Priority Access
					</ScrollButton>
				</div>
			</div>
		</section>
	);
}
