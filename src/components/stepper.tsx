import { cn } from "gen/cn";
import { Check } from "lucide-react";

export interface Step {
	name: string;
	index: number;
}

export function Stepper({
	steps,
	currentStep,
	onStepClick,
}: {
	steps: Step[];
	currentStep: number;
	onStepClick: (step: number) => void;
}) {
	return (
		<nav aria-label="Progress" className="mb-8">
			<ol role="list" className="space-y-4 md:flex md:space-x-4 md:space-y-0">
				{steps.map((step) => (
					<li key={step.name} className="md:flex-1">
						<button
							onClick={() => {
								onStepClick(step.index);
							}}
							className={cn(
								"group flex w-full flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4",
								step.index < currentStep
									? "border-blue-600 hover:border-primary/80"
									: step.index === currentStep
										? "border-primary"
										: "border-secondary hover:dark:border-gray-400 hover:border-gray-400",
							)}
						>
							<span className="text-sm font-medium">
								{step.index < currentStep ? (
									<span className="flex items-center text-primary">
										<Check className="mr-2 h-5 w-5" />
										<span className="hidden md:inline">{step.name}</span>
									</span>
								) : (
									<span>{step.name}</span>
								)}
							</span>
						</button>
					</li>
				))}
			</ol>
		</nav>
	);
}
