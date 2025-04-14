import { HTMLProps } from "react";
import { PatternedBackground } from "./backgrounds";

const CORE_FEATURES = [
	{
		description:
			"GrantFlow.ai was built with researchers' unique needs in mind, incorporating insights from dozens of grant-winning scientists. Our platform prioritizes what matters most: turning complex research into compelling proposals while streamlining collaborative workflows and adapting to specific funding agency requirements.",
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
		<section aria-labelledby="core-features-section" className="relative w-full bg-white">
			<PatternedBackground aria-hidden="true" className="absolute inset-0 z-0 w-full h-auto" />
			<div className="relative z-10 flex flex-col items-center text-center py-10 px-8 md:px-10 lg:px-20 xl:px-30 text-stone-800">
				<h2
					className="font-heading text-3xl md:text-4xl font-medium my-3 md:my-5 lg:my-8 xl-my-10"
					id="core-features-heading"
				>
					Core Features Designed for Researchers
				</h2>
				<div className="md:hidden relative w-full flex text-start py-6 overflow-x-auto snap-x snap-mandatory gap-12">
					{CORE_FEATURES.map((feature, index) => (
						<FeatureArticle
							className="flex-none snap-center w-[22rem]"
							featureDescription={feature.description}
							featureTitle={feature.title}
							key={index}
						/>
					))}
				</div>
				<div className="hidden md:grid md:grid-cols-2 justify-center text-start py-4 px-10 lg:px-26 m-8 lg:m-12 gap-12">
					{CORE_FEATURES.map((feature, index) => (
						<FeatureArticle
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
			<div className="w-0 h-0 border-l-12 md:border-l-10 border-r-12 md:border-r-10 border-b-20 md:border-b-16 border-l-transparent border-r-transparent border-b-background shadow-sm" />
			<h3 className="font-heading font-medium text-2xl my-5 md:my-3">{featureTitle}</h3>
			<p className="md:leading-tight text-lg md:text-sm">{featureDescription}</p>
		</article>
	);
}
