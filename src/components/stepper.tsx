interface StepperProps {
	currentStep: number;
	onStepClick: (step: number) => void;
	steps: string[];
}

export function Stepper({ currentStep, onStepClick, steps }: StepperProps) {
	return (
		<div className="mb-8 space-y-4" data-testid="stepper">
			<div className="flex justify-between">
				{steps.map((title, index) => (
					<button
						aria-current={currentStep === index ? "step" : undefined}
						className={`flex flex-col items-center flex-1 ${index === steps.length - 1 ? "" : "mr-1"}`}
						data-testid={`step-button-${index}`}
						key={index}
						onClick={() => {
							onStepClick(index);
						}}
					>
						<div
							className={`h-2 w-full ${
								index <= currentStep ? "bg-primary" : "bg-muted"
							} rounded-[calc(var(--radius)/2)] mb-2 transition-colors`}
							data-testid={`step-indicator-${index}`}
						/>
						<span
							className={`text-sm ${
								index === currentStep ? "font-bold text-primary" : "text-muted-foreground"
							} transition-colors`}
						>
							{title}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
