import Image from "next/image";
import { BrandPattern } from "@/components/branding/brand-pattern";
import { IconGoAhead } from "@/components/branding/icons";
import { AnimatedGradientBackground } from "@/components/landing-page/backgrounds-animated";
import { NavHeader } from "./nav-header";
import { LandingPageScrollButton } from "./scroll-button";

export function HeroBanner() {
	return (
		<section className="relative bg-white">
			<NavHeader />
			<AnimatedGradientBackground className="absolute inset-0 z-10" />
			<BrandPattern
				aria-hidden="true"
				className="absolute bottom-0 right-0 z-20 h-4/5 w-[70%] md:h-4/5 md:w-auto"
				role="presentation"
			/>
			<div className="lg:mx-15 lg:mb-15 items-between relative z-30 mb-5 mt-20 flex items-center justify-between px-4 py-5 md:mx-5 md:mb-10 md:px-5 xl:m-20 xl:px-10 ">
				<div className="flex max-w-md flex-col md:max-w-lg lg:max-w-xl ">
					<h1 className="font-heading text-app-black text-5xl leading-[1.2] sm:text-6xl sm:leading-[1.15] md:text-[4.215rem] md:leading-[1.1]">
						Where Research Meets Funding, Seamlessly.
					</h1>
					<div className="mt-10">
						<LandingPageScrollButton
							aria-label="Go to Waitlist Form"
							desktopTargetId="waitlist"
							rightIcon={<IconGoAhead />}
							size="lg"
						>
							Secure Priority Access
						</LandingPageScrollButton>
					</div>
				</div>
				<div className="hidden lg:block">
					<Image
						alt="Grantflow Wizard"
						className="size-full max-w-[800px]"
						height={729}
						src="/assets/landing-wizard.png"
						width={1003}
					/>
				</div>
			</div>
		</section>
	);
}
