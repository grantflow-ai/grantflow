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
						className={`flex flex-1 flex-col items-center ${index === steps.length - 1 ? "" : "mr-1"}`}
						data-testid={`step-button-${index}`}
						key={index}
						onClick={() => {
							onStepClick(index);
						}}
						type="button"
					>
						<div
							className={`h-2 w-full ${
								index <= currentStep ? "bg-primary" : "bg-muted"
							} mb-2 rounded-[calc(var(--radius)/2)] transition-colors`}
							data-testid={`step-indicator-${index}`}
						/>
						<span
							className={`text-sm ${
								index === currentStep ? "text-primary font-bold" : "text-muted-foreground"
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
