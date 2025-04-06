import { PatternedBackground } from "./backgrounds";

export function CoreFeaturesSection() {
	const coreFeatures = [
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

	return (
		<section aria-labelledby="core-features-section" className="relative w-full bg-white">
			<PatternedBackground aria-hidden="true" className="absolute inset-0 z-0 w-full h-auto" />
			<div className="flex flex-col items-center text-center py-10 px-30 relative z-10 text-stone-800">
				<h2 className="font-heading text-4xl font-medium my-10" id="core-features-heading">
					Core Features Designed for Researchers
				</h2>
				<div className="grid grid-cols-2 justify-center text-start py-4 px-26 m-12 gap-12">
					{coreFeatures.map((feature, index) => (
						<article id="feature-item" key={index}>
							<div className="w-0 h-0 border-l-10 border-r-10 border-b-16 border-l-transparent border-r-transparent border-b-background shadow-sm" />
							<h3 className="font-heading font-medium text-2xl my-3">{feature.title}</h3>
							<p className="leading-tight text-sm">{feature.description}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
