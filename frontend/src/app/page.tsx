/* eslint-disable @typescript-eslint/require-await */
"use server";

import { Footer } from "@/components/footer";
import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { NavHeader } from "@/components/landing-page/nav-header";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";

export default async function LandingPage() {
	return (
		<div className="flex flex-col">
			<NavHeader />
			<HeroBanner />
			<BenefitsSection />
			<EarlyAccessSection />
			<TestimonialsSection />
			<Footer />
		</div>
	);
}
