import { HTMLProps } from "react";

import { PatternedBackground } from "@/components/landing-page/backgrounds";
import { AnimatedFeatureArticle } from "@/components/landing-page/feature-articles-animated";
import { ScrollFadeElement } from "@/components/landing-page/scroll-fade-element";

const CORE_FEATURES = [
	{
		description:
			"GrantFlow was built with researchers' unique needs in mind, incorporating insights from dozens of grant-winning scientists. Our platform prioritizes what matters most: turning complex research into compelling proposals while streamlining collaborative workflows and adapting to specific funding agency requirements.",
		title: "A Platform Built for Researchers",
	},
	{
		description:
			"Organize all your research projects in one workspace. Easily curate a knowledge base for each proposal and develop multiple proposal iterations in mere minutes.",
		title: "Grant Applications Studio",
	},
	{
		description:
			"Easily integrate feedback from collaborators, turning individual insights into powerful applications without complex coordination. Seamlessly manage who can participate in the application process, ensuring everyone from administrators to researchers can contribute efficiently.",
		title: "Collaborative Workspace",
	},
	{
		description:
			"Create proposals customized to any funding opportunity—from major bodies like NIH and ERC to specialized research calls from institutions worldwide. Our AI assistance is fine-tuned for technical and cutting-edge research language, enabling seamless conversion between different funders' formats and requirements with minimal effort.",
		title: "Customizable Proposals",
	},
];

export function CoreFeaturesSection() {
	return (
		<section aria-label="core-features-section" className="relative w-full bg-white">
			<div className="absolute inset-0 z-0">
				<PatternedBackground aria-hidden="true" />
			</div>
			<div className="xl:px-30 relative z-10 flex w-full flex-col items-center px-8 py-10 text-center text-stone-800 md:px-10 lg:px-20">
				<ScrollFadeElement className="mx-auto">
					<h2
						className="font-heading xl-my-10 my-3 text-3xl font-medium md:my-5 md:text-4xl lg:my-8"
						id="core-features-heading"
					>
						Core Features Designed for Researchers
					</h2>
				</ScrollFadeElement>
				<div className="relative flex w-[calc(100vw-5rem)] snap-x snap-mandatory gap-12 overflow-x-auto py-6 text-start md:hidden">
					{CORE_FEATURES.map((feature, index) => (
						<FeatureArticle
							className={`w-88 flex-none snap-start ${index === 0 ? "ml-4" : ""} ${
								index === CORE_FEATURES.length - 1 ? "mr-4" : ""
							}`}
							featureDescription={feature.description}
							featureTitle={feature.title}
							key={index}
						/>
					))}
				</div>
				<div className="lg:px-26 m-8 hidden justify-center gap-12 px-10 py-4 text-start md:grid md:grid-cols-2 lg:m-12">
					{CORE_FEATURES.map((feature, index) => (
						<AnimatedFeatureArticle
							featureDescription={feature.description}
							featureTitle={feature.title}
							key={index}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

function FeatureArticle({
	className,
	featureDescription,
	featureTitle,
	...props
}: { featureDescription: string; featureTitle: string } & HTMLProps<HTMLElement>) {
	return (
		<article className={className} id="feature-item" {...props}>
			<div className="border-l-12 md:border-l-10 border-r-12 md:border-r-10 border-b-20 md:border-b-16 border-b-background size-0 border-x-transparent" />
			<h3 className="font-heading my-5 text-2xl font-medium md:my-3">{featureTitle}</h3>
			<p className="text-lg md:text-sm md:leading-tight">{featureDescription}</p>
		</article>
	);
}
