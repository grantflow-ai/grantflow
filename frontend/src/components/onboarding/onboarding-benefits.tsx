import { IconTick } from "@/components/onboarding/icons";

const benefitItems = [
	{
		description:
			"Get up and running quickly with intelligent tools that simplify the entire grant application process.",
		title: "Start applying faster",
	},
	{
		description:
			"From discovery to submission, GrantFlow.ai supports labs, institutions, and independent researchers across all disciplines.",
		title: "Support every research journey",
	},
	{
		description: "Trusted by leading labs and ambitious researchers working to change the world.",
		title: "Join a growing research community",
	},
];

export function BenefitsList({ className = "" }: { className?: string }) {
	return (
		<ul className={`space-y-4 ${className}`} data-testid="benefits-list">
			{benefitItems.map((item, index) => (
				<li className="flex flex-row items-start" key={index}>
					<div className="flex shrink-0 items-center justify-center">
						<IconTick className="mr-2 mt-1" height={14} width={14} />
					</div>
					<div className="">
						<h5 className="font-heading mb-2 font-semibold">{item.title}</h5>
						<p className="text-app-gray-600 leading-tight">{item.description}</p>
					</div>
				</li>
			))}
		</ul>
	);
}
