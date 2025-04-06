/* eslint-disable @typescript-eslint/require-await */
"use server";

import { BenefitsSection } from "@/components/landing-page/benefits-section";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";
import { EarlyAccessSection } from "@/components/landing-page/early-access-section";
import { GradientBackground } from "@/components/landing-page/backgrounds";
import { HeroBanner } from "@/components/landing-page/hero-banner";
import { NavHeader } from "@/components/landing-page/nav-header";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import { LinkedIn } from "@/components/linkedin-icon";
import { LogoDark } from "@/components/logo-dark";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconGoAhead } from "@/components/landing-page/icons";

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
			<div className="relative z-10 flex items-center py-20 px-30">
				<div className="flex flex-col flex-1 text-white">
					<h2 className="font-heading text-3xl" id="cta-heading">
						Ready to Transform Your Grant Writing Process?
					</h2>
					<p className="mt-2 text-base font-light">
						Join leading research teams who are saving time, improving collaboration, and <br /> securing
						more funds with GrantFlow.
					</p>
				</div>
				<Button className="mx-4 shrink-0 p-4 text-base">
					Try for free
					<IconGoAhead />
				</Button>
				<Button className="shrink-0 bg-transparent text-base rounded" variant="outline">
					<IconCalendar />
					Schedule a Demo
				</Button>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer aria-labelledby="site-footer" className="bg-white relative z-0">
			<div className="flex justify-between items-center px-8 pt-4 mb-10">
				<LogoDark className="h-16 w-52" />
				<nav aria-label="footer-navigation">
					<ul className="flex gap-6 text-primary font-button">
						<li>
							<a className="hover:underline" href="/terms">
								Terms of Use
							</a>
						</li>
						<li>
							<a className="hover:underline" href="/privacy-policy">
								Privacy Policy
							</a>
						</li>
					</ul>
				</nav>
				<LinkedIn className="size-8" />
			</div>
		</footer>
	);
}
