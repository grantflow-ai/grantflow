import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app/buttons/app-button";
import { IconGoAhead, IconGoBack } from "@/components/branding/icons";
import {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
	IconApprove,
	IconButtonLogo,
	IconDeadline,
} from "@/components/projects/shared/icons";
import { DevPanel } from "@/components/projects/wizard/dev-tools/dev-panel";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

const WIZARD_STEP_ORDER: WizardStep[] = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.APPLICATION_STRUCTURE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
];

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

	const lineClass = type === "done" ? "bg-action-primary" : "bg-app-gray-300";

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
			className="relative flex h-auto w-full items-center justify-between border-t border-border-primary bg-surface-primary p-6"
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
			<DevPanel />
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
	const router = useRouter();
	const currentStep = useWizardStore((state) => state.currentStep);
	const reset = useWizardStore((state) => state.reset);
	const application = useApplicationStore((state) => state.application);
	const showHeaderInfo = currentStep !== WizardStep.APPLICATION_DETAILS;
	const isFirstStep = currentStep === WizardStep.APPLICATION_DETAILS;

	const handleExit = () => {
		reset();
		if (application?.project_id) {
			router.push(`/projects/${application.project_id}`);
		} else {
			router.push("/projects");
		}
	};

	return (
		<header className="w-full border-b border-solid border-border-primary p-4 sm:p-6" data-testid="wizard-header">
			<div className="flex items-center justify-between mb-6 sm:mb-8">
				<div className="flex min-h-7 items-center space-x-2">
					{showHeaderInfo ? (
						<>
							<h1
								className="text-sm sm:text-base text-nowrap font-medium text-text-primary"
								data-testid="app-name"
							>
								{application?.title}
							</h1>
							<Deadline />
						</>
					) : (
						<div className="invisible" />
					)}
				</div>
				<AppButton
					className="py-0 text-sm sm:text-base text-action-primary"
					data-testid="exit-button"
					onClick={handleExit}
					size="lg"
					variant="link"
				>
					{isFirstStep ? "Exit" : "Save and Exit"}
				</AppButton>
			</div>
			<ApplicationProgressBar currentStep={currentStep} stepTitles={WIZARD_STEP_ORDER} />
		</header>
	);
}

function ApplicationProgressBar({ currentStep, stepTitles }: { currentStep: WizardStep; stepTitles: WizardStep[] }) {
	return (
		<div className="flex justify-center">
			<div
				aria-label="Application wizard progress"
				aria-valuemax={stepTitles.length}
				aria-valuemin={1}
				aria-valuenow={stepTitles.indexOf(currentStep) + 1}
				className="flex w-full flex-col items-center px-4 sm:px-16"
				data-testid="step-indicators"
				role="progressbar"
			>
				<div className="relative flex w-full justify-center px-4 sm:px-20">
					{stepTitles.map((title: WizardStep, index: number) => {
						const isLastStep = index === stepTitles.length - 1;
						const currentStepIndex = stepTitles.indexOf(currentStep);

						return (
							<div
								aria-current={index === currentStepIndex ? "step" : undefined}
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
										className="absolute -bottom-8 flex w-full justify-center"
										data-testid="step-title-container"
									>
										<span
											aria-hidden="true"
											className={`font-heading text-center text-xs max-w-full truncate ${(() => {
												if (index < currentStepIndex) {
													return "text-text-secondary";
												}
												if (index === currentStepIndex) {
													return "text-action-primary";
												}
												return "text-app-gray-400";
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

function calculateTimeDifference(submissionDate: string): number {
	const now = new Date();
	const deadline = new Date(submissionDate);
	return deadline.getTime() - now.getTime();
}

function Deadline() {
	const application = useApplicationStore((state) => state.application);
	const submissionDate = application?.grant_template?.submission_date;

	const getTimeRemaining = () => {
		if (!submissionDate) {
			return "Deadline not set";
		}

		const diffTime = calculateTimeDifference(submissionDate);

		if (diffTime <= 0) {
			return "Deadline passed";
		}

		return formatTimeRemaining(diffTime);
	};

	const timeRemaining = getTimeRemaining();

	return (
		<div
			className="rounded-xs bg-surface-secondary relative box-border flex w-full flex-row items-center justify-center gap-0.5 px-2 py-1 text-sm text-text-primary"
			data-testid="deadline-component"
		>
			<IconDeadline />
			<div className="leading-[18px]">
				{submissionDate ? <span>{timeRemaining}</span> : <span>Deadline not set</span>}
			</div>
		</div>
	);
}

function formatTimeRemaining(diffTime: number): string {
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const weeks = Math.floor(diffDays / 7);
	const days = diffDays % 7;

	if (weeks > 0 && days > 0) {
		return `${weeks} week${weeks === 1 ? "" : "s"} and ${days} day${days === 1 ? "" : "s"} to the deadline`;
	}
	if (weeks > 0) {
		return `${weeks} week${weeks === 1 ? "" : "s"} to the deadline`;
	}
	return `${days} day${days === 1 ? "" : "s"} to the deadline`;
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
