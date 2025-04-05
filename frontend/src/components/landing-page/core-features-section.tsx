import { PatternedBackground } from "./patterned-bg";

const coreFeatures = [
	{
		description:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation",
		title: "A Platform Built for Researchers",
	},
	{
		description:
			"Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi.",
		title: "Grant Applications Studio",
	},
	{
		description:
			"Your entire team can participate in the application process, ensuring everyone from administrators to researchers can contribute efficiently.",
		title: "Collaborative Workspace",
	},
	{
		description:
			"Create proposals that meet the specific guidelines of major funding bodies like NIH, NSF, and ERC, with AI assistance fine-tuned for technical and cutting-edge research language.",
		title: "Customizable Proposals",
	},
	{
		description:
			"Lorem ipsum dolor sit amet consectetur. Eget placerat sollicitudin accumsan ac ullamcorper justo. Tortor nunc ipsum amet enim diam. Risus phasellus suspendisse sit at amet purus. Duis.",
		title: "AI-Driven Support",
	},
	{
		description:
			"Create proposals that meet the specific guidelines of major funding bodies like NIH, NSF, and ERC, with AI assistance fine-tuned for technical and cutting-edge research language.",
		title: "Customizable Templates",
	},
];

export function CoreFeaturesSection() {
	return (
		<section aria-labelledby="core-features-section" className="relative w-full bg-white">
			<PatternedBackground aria-hidden="true" className="absolute inset-0 z-0 w-full h-auto" />
			<div className="flex flex-col items-center text-center py-10 px-30 relative z-10 text-stone-800">
				<h2 className="font-heading text-4xl font-medium my-10" id="core-features-heading">
					Core Features Designed for Researchers
				</h2>
				<div className="grid grid-cols-3 justify-center text-start py-4 px-26 m-12 gap-12">
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
