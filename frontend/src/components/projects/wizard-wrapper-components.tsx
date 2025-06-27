import { AppButton } from "@/components/app-button";
import { IconGoAhead, IconGoBack } from "@/components/icons";
import {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
	IconApprove,
	IconButtonLogo,
	IconDeadline,
} from "@/components/projects/icons";
import { DevAutofillButton } from "@/components/projects/wizard/dev-autofill-button";
import { DevResetButton } from "@/components/projects/wizard/dev-reset-button";
import { WIZARD_STEP_TITLES, WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export function StepIndicator({ isLastStep, type }: { isLastStep: boolean; type: "active" | "done" | "inactive" }) {
	let IconComponent: React.ComponentType;
	if (type === "done") {
		IconComponent = IconApplicationStepDone;
	} else if (type === "active") {
		IconComponent = IconApplicationStepActive;
	} else {
		IconComponent = IconApplicationStepInActive;
	}

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
	const currentStep = useWizardStore((state) => state.currentStep);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const toNextStep = useWizardStore((state) => state.toNextStep);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const validateStepNext = useWizardStore((state) => state.validateStepNext);
	const { leftIcon, rightButtonText, rightIcon } = generateFooterRightButtonProps(currentStep);
	const showBack = currentStep !== WizardStep.APPLICATION_DETAILS;
	const disabled = !validateStepNext();
	const backDisabled = currentStep === WizardStep.APPLICATION_STRUCTURE && isGeneratingTemplate;

	return (
		<footer
			className="border-app-lavender-gray relative flex h-auto w-full items-center justify-between border-t bg-white p-6"
			data-testid="wizard-footer"
		>
			{showBack ? (
				<AppButton
					data-testid="back-button"
					disabled={backDisabled}
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
			<div className="absolute left-1/2 flex -translate-x-1/2 flex-col gap-2">
				<DevAutofillButton />
				<DevResetButton />
			</div>
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
	const currentStep = useWizardStore((state) => state.currentStep);
	const application = useApplicationStore((state) => state.application);
	const showHeaderInfo = currentStep !== WizardStep.APPLICATION_DETAILS;
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
	currentStep: (typeof WIZARD_STEP_TITLES)[number];
	stepTitles: typeof WIZARD_STEP_TITLES;
}) {
	return (
		<div className="flex justify-center">
			<div className="flex w-full flex-col items-center px-16" data-testid="step-indicators">
				<div className="relative flex w-full justify-center px-20">
					{stepTitles.map((title, index) => {
						const isLastStep = index === stepTitles.length - 1;
						const currentStepIndex = stepTitles.indexOf(currentStep);

						return (
							<div
								className={`${isLastStep ? "w-auto flex-initial" : "flex-1"} relative flex flex-col items-center`}
								data-testid={`step-${index}`}
								key={index}
							>
								<div className={`flex items-center ${isLastStep ? "" : "w-full"} relative`}>
									{(() => {
										if (index < currentStepIndex) {
											return <StepIndicator isLastStep={isLastStep} type="done" />;
										}
										if (index === currentStepIndex) {
											return <StepIndicator isLastStep={isLastStep} type="active" />;
										}
										return <StepIndicator isLastStep={isLastStep} type="inactive" />;
									})()}

									<div
										className="absolute -bottom-8 flex justify-center text-nowrap"
										style={{
											left: "0",
											transform: "translateX(-45%)",
										}}
									>
										<span
											className={`font-heading text-center text-xs ${(() => {
												if (index < currentStepIndex) {
													return "text-secondary";
												}
												if (index === currentStepIndex) {
													return "text-primary";
												}
												return "text-gray-400";
											})()}`}
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

function generateFooterRightButtonProps(currentStep: WizardStep) {
	const isApproveStep = currentStep === WizardStep.APPLICATION_STRUCTURE;
	const isGenerateStep = currentStep === WizardStep.GENERATE_AND_COMPLETE;

	return {
		leftIcon: (() => {
			if (isApproveStep) {
				return <IconApprove />;
			}
			if (isGenerateStep) {
				return <IconButtonLogo />;
			}
			return undefined;
		})(),
		rightButtonText: (() => {
			if (isApproveStep) {
				return "Approve and Continue";
			}
			if (isGenerateStep) {
				return "Generate";
			}
			return "Next";
		})(),
		rightIcon: isGenerateStep ? undefined : <IconGoAhead />,
	};
}
