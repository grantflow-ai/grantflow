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
import { ScrollButton } from "@/components/scroll-button";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";
import Image from "next/image";
import linkedInIcon from "@/assets/linkedin-icon.png";
import Link from "next/link";

const CONTENT_CTA_SECTION = {
	description:
		"Join leading research teams who are saving time, improving collaboration, and securing more funds with GrantFlow.ai.",
	heading: "Ready to Transform Your Grant Writing Process?",
};

const LinkedInLink = () => {
	return (
		<a
			aria-label="LinkedIn Icon"
			href="https://www.linkedin.com/company/grantflowai/"
			rel="noopener noreferrer"
			target="_blank"
		>
			<Image alt="LinkedIn" className="size-9.5" height={38} src={linkedInIcon} width={38} />
		</a>
	);
};

const FooterLinks = ({ isMobile = false }) => {
	return (
		<ul className={`text-primary font-button flex gap-5 ${isMobile ? "flex-col items-end my-1" : ""}`}>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline`}
					href={""}
				>
					Terms of Use
				</Link>
			</li>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline`}
					href={""}
				>
					Privacy Policy
				</Link>
			</li>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline`}
					href={""}
				>
					Imprint
				</Link>
			</li>
		</ul>
	);
};

// page components are Server Components by default and need to be async to properly handle server-side operations
// eslint-disable-next-line @typescript-eslint/require-await
export default async function LandingPage() {
	return (
		<div className="flex flex-col">
			<NavHeader />
			<HeroBanner />
			<BenefitsSection />
			<EarlyAccessSection />
			<CoreFeaturesSection />
			<TestimonialsSection />
			<CTASection />
			<Footer />
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
		<footer aria-label="site-footer" className="relative z-0 bg-white" data-testid="site-footer" id="site-footer">
			<div className="md:hidden flex flex-col px-6 py-2">
				<nav aria-label="footer-navigation">
					<FooterLinks isMobile />
				</nav>
				<div className="flex w-full items-center justify-between">
					<Link aria-label="Go to homepage" href="/">
						<LogoDark className="h-15.5" height="250" width="250" />
					</Link>
					<LinkedInLink />
				</div>
			</div>
			<div className="hidden md:flex md:flex-row items-center justify-between mx-2 my-6 px-8">
				<Link aria-label="Go to homepage" href="/">
					<LogoDark className="h-15.5" height="250" width="250" />
				</Link>
				<nav aria-label="footer-navigation">
					<FooterLinks />
				</nav>
				<LinkedInLink />
			</div>
		</footer>
	);
}
