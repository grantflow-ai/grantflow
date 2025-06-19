import { AppButton } from "@/components/app-button";
import { IconGoAhead, IconGoBack } from "@/components/icons";
import {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
	IconApprove,
	IconButtonLogo,
	IconDeadline,
} from "@/components/workspaces/icons";
import { DevAutofillButton } from "@/components/workspaces/wizard/dev-autofill-button";
import { WIZARD_STEP_TITLES } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export function StepIndicator({ isLastStep, type }: { isLastStep: boolean; type: "active" | "done" | "inactive" }) {
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
		<div className="relative flex w-full flex-row items-center" data-testid={`step-${type}`}>
			<div className="relative flex justify-center">
				<IconComponent />
			</div>
			<div className={`flex-1 ${lineClass} h-px`} />
		</div>
	);
}

export function WizardFooter() {
	const { currentStep, toNextStep, toPreviousStep, validateStepNext } = useWizardStore();
	const { leftIcon, rightButtonText, rightIcon } = generateFooterRightButtonProps(currentStep);
	const showBack = currentStep > 0;
	const disabled = !validateStepNext();

	return (
		<footer
			className="border-app-lavender-gray relative flex h-auto w-full items-center justify-between border-t bg-white p-6"
			data-testid="wizard-footer"
		>
			{showBack ? (
				<AppButton
					data-testid="back-button"
					leftIcon={<IconGoBack />}
					onClick={toPreviousStep}
					size="lg"
					theme="dark"
					variant="secondary"
				>
					Back
				</AppButton>
			) : (
				<div />
			)}
			<DevAutofillButton />
			<AppButton
				data-testid="continue-button"
				disabled={disabled}
				leftIcon={leftIcon}
				onClick={() => {
					toNextStep();
				}}
				rightIcon={rightIcon}
				size="lg"
				variant="primary"
			>
				{rightButtonText}
			</AppButton>
		</footer>
	);
}

export function WizardHeader() {
	const { currentStep } = useWizardStore();
	const { application } = useApplicationStore();
	const showHeaderInfo = currentStep > 0;
	return (
		<header className="border-app-lavender-gray w-full border-b border-solid p-6" data-testid="wizard-header">
			<div className="mb-8 flex items-center justify-between">
				<div className="flex min-h-7 items-center space-x-2">
					{showHeaderInfo ? (
						<>
							<h1 className="text-nowrap" data-testid="app-name">
								{application?.title}
							</h1>
							<Deadline />
						</>
					) : (
						<div className="invisible" />
					)}
				</div>
				<AppButton className="py-0 text-base" data-testid="exit-button" size="lg" variant="link">
					Exit
				</AppButton>
			</div>
			<ApplicationProgressBar currentStep={currentStep} stepTitles={WIZARD_STEP_TITLES} />
		</header>
	);
}

function ApplicationProgressBar({
	currentStep,
	stepTitles,
}: {
	currentStep: number;
	stepTitles: typeof WIZARD_STEP_TITLES;
}) {
	return (
		<div className="flex justify-center">
			<div className="flex w-full flex-col items-center px-16" data-testid="step-indicators">
				<div className="relative flex w-full justify-center px-20">
					{stepTitles.map((title, index) => {
						const isLastStep = index === stepTitles.length - 1;

						return (
							<div
								className={`${isLastStep ? "w-auto flex-initial" : "flex-1"} relative flex flex-col items-center`}
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
											className={`font-heading text-center text-xs ${
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
				<div className="h-8" />
			</div>
		</div>
	);
}

function Deadline() {
	return (
		<div
			className="rounded-xs bg-app-lavender-gray relative box-border flex w-full flex-row items-center justify-center gap-0.5 px-2 py-1 text-sm"
			data-testid="deadline-component"
		>
			<IconDeadline />
			<div className="leading-[18px]">
				<span className="font-semibold">4</span>
				<span> weeks and </span>
				<span className="font-semibold">3</span>
				<span> days to the deadline</span>
			</div>
		</div>
	);
}

function generateFooterRightButtonProps(currentStep: number) {
	const isApproveStep = currentStep === 1;
	const isGenerateStep = currentStep === 5;

	return {
		leftIcon: isApproveStep ? <IconApprove /> : isGenerateStep ? <IconButtonLogo /> : undefined,
		rightButtonText: isApproveStep ? "Approve and Continue" : isGenerateStep ? "Generate" : "Next",
		rightIcon: isGenerateStep ? undefined : <IconGoAhead />,
	};
}
