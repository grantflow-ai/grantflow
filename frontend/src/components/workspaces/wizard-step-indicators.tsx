import {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
} from "@/components/workspaces/icons";

interface WizardStepIndicatorsProps {
	currentStep: number;
	stepTitles: string[];
}

export function WizardStepIndicators({ currentStep, stepTitles }: WizardStepIndicatorsProps) {
	return (
		<div className="flex justify-center">
			<div className="flex w-full px-16 flex-col items-center" data-testid="step-indicators">
				<div className="flex w-full px-20 justify-center relative">
					{stepTitles.map((title, index) => {
						const isLastStep = index === stepTitles.length - 1;

						return (
							<div
								className={`${isLastStep ? "flex-initial w-auto" : "flex-1"} flex flex-col items-center relative`}
								data-testid={`step-${index}`}
								key={index}
							>
								<div className={`flex items-center ${isLastStep ? "" : "w-full"} relative`}>
									{index < currentStep ? (
										<StepIndicator isLastStep={isLastStep} type="done" />
									) : index === currentStep ? (
										<StepIndicator isLastStep={isLastStep} type="active" />
									) : (
										<StepIndicator isLastStep={isLastStep} type="inactive" />
									)}

									<div
										className="absolute -bottom-8 flex justify-center text-nowrap"
										style={{
											left: "0",
											transform: "translateX(-45%)",
										}}
									>
										<span
											className={`text-xs text-center font-heading ${
												index < currentStep
													? "text-secondary"
													: index === currentStep
														? "text-primary"
														: "text-gray-400"
											}`}
											data-testid={`step-title-${index}`}
										>
											{title}
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
				<div className="h-8"></div>
			</div>
		</div>
	);
}

function StepIndicator({ isLastStep, type }: { isLastStep: boolean; type: "active" | "done" | "inactive" }) {
	const IconComponent =
		type === "done"
			? IconApplicationStepDone
			: type === "active"
				? IconApplicationStepActive
				: IconApplicationStepInActive;

	if (isLastStep) {
		return (
			<div className="relative flex flex-row items-start justify-start" data-testid={`step-${type}`}>
				<IconComponent />
			</div>
		);
	}

	const lineClass = type === "done" ? "bg-primary" : "bg-muted";

	return (
		<div className="w-full relative flex flex-row items-center" data-testid={`step-${type}`}>
			<div className="relative flex justify-center">
				<IconComponent />
			</div>
			<div className={`flex-1 ${lineClass} h-px`} />
		</div>
	);
}
