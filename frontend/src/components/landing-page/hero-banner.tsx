import { HTMLProps } from "react";
import { GradientBackground } from "./backgrounds";
import { IconGoAhead } from "./icons";
import { AppButton } from "@/components/app-button";

export function HeroBanner() {
	return (
		<section className="relative">
			<GradientBackground className="absolute inset-0 z-10" />
			<HeroPattern
				aria-hidden="true"
				className="absolute right-0 bottom-0 z-20 h-[80%] w-[70%] md:h-[90%] lg:h-full md:w-auto"
				role="presentation"
			/>
			<div className="relative z-30 flex flex-col max-w-md md:max-w-lg lg:max-w-xl md:mx-5 lg:mx-15 py-5 px-4 md:px-5 xl:px-10 mt-20 mb-5 md:mb-10 lg:mb-15 xl:m-20">
				<h1 className="font-heading text-5xl leading-[1.2] sm:text-6xl sm:leading-[1.15] md:text-[4.215rem] md:leading-[1.1]">
					Where Research Meets Funding, Seamlessly.
				</h1>
				<div className="flex mt-8 gap-6 items-center">
					<AppButton size="lg" theme="light" variant="secondary">
						Contact us
					</AppButton>
					<AppButton rightIcon={<IconGoAhead />} size="lg">
						Try For Free
					</AppButton>
				</div>
			</div>
		</section>
	);
}

function HeroPattern({ ...props }: HTMLProps<SVGSVGElement>) {
	return (
		<svg
			fill="none"
			height="491"
			preserveAspectRatio="none"
			viewBox="0 0 846 491"
			width="846"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M847 1L670 126L609 73L551 126M847 1L753 168L551 126M847 1V501H1L289 393M847 1L665 21L551 126M388.5 137.5L566 327M388.5 137.5L243 301M388.5 137.5L551 126M566 327L551 126M566 327L566.956 330.772M551 126L763 363L805 340L847 317L718 501L464 418L282 501L289 393M289 393L362 352L584 398L566.956 330.772M289 393L243 301M566.956 330.772L243 301"
				stroke="url(#paint0_linear_48_19)"
				strokeWidth="0.3"
			/>
			<defs>
				<linearGradient
					gradientUnits="userSpaceOnUse"
					id="paint0_linear_48_19"
					x1="323"
					x2="842"
					y1="117"
					y2="507"
				>
					<stop stopColor="white" />
					<stop offset="1" stopColor="#1E13F8" />
				</linearGradient>
			</defs>
		</svg>
	);
}
