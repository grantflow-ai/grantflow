import Link from "next/link";

import { AppButton } from "@/components/app-button";
import { BrandPattern } from "@/components/brand-pattern";
import { IconGoAhead } from "@/components/icons";
import { AnimatedGradientBackground } from "@/components/landing-page/backgrounds-animated";

import { ScrollButton } from "../scroll-button";

export function HeroBanner() {
	return (
		<section className="relative">
			<AnimatedGradientBackground className="absolute inset-0 z-10" />
			<BrandPattern
				aria-hidden="true"
				className="absolute bottom-0 right-0 z-20 h-4/5 w-[70%] md:h-[90%] md:w-auto lg:h-full"
				role="presentation"
			/>
			<div className="lg:mx-15 lg:mb-15 relative z-30 mb-5 mt-20 flex max-w-md flex-col px-4 py-5 md:mx-5 md:mb-10 md:max-w-lg md:px-5 lg:max-w-xl xl:m-20 xl:px-10">
				<h1 className="font-heading text-5xl leading-[1.2] sm:text-6xl sm:leading-[1.15] md:text-[4.215rem] md:leading-[1.1]">
					Where Research Meets Funding, Seamlessly.
				</h1>
				<div className="mt-8 flex items-center gap-6">
					<AppButton size="lg" theme="light" variant="secondary">
						<Link href="mailto:contact@grantflow.ai">Contact us</Link>
					</AppButton>
					<ScrollButton
						aria-label="Go to Waitlist Form"
						desktopTargetId="waitlist"
						mobileTargetId="waitlist-form-container"
						offset={10}
						rightIcon={<IconGoAhead />}
						size="lg"
					>
						Start here
					</ScrollButton>
				</div>
			</div>
		</section>
	);
}
