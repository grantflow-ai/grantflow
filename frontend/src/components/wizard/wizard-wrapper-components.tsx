import { format } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardStep } from "@/constants";
import { PagePath } from "@/enums";
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

type IndicatorStatus = "active" | "done" | "inactive";

export function getStepIcon(type: IndicatorStatus) {
	if (type === "done") {
		return <Image alt="Step done" height={15} src="/icons/application-step-done.svg" width={15} />;
	}
	if (type === "active") {
		return <Image alt="Step active" height={15} src="/icons/application-step-active.svg" width={15} />;
	}
	return <Image alt="Step inactive" height={15} src="/icons/application-step-inactive.svg" width={15} />;
}

export function StepIndicator({ isLastStep, type }: { isLastStep: boolean; type: IndicatorStatus }) {
	if (isLastStep) {
		return (
			<div className="relative flex flex-row items-start justify-start" data-testid={`step-${type}`}>
				{getStepIcon(type)}
			</div>
		);
	}

	const lineClass = type === "done" ? "bg-primary" : "bg-app-gray-300";

	return (
		<div className="relative flex w-full flex-row items-center" data-testid={`step-${type}`}>
			<div className="relative flex justify-center">{getStepIcon(type)}</div>
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
			className="relative flex h-auto w-full items-center justify-between border-t-1 border-gray-100 bg-surface-primary p-6"
			data-testid="wizard-footer"
		>
			{showBack ? (
				<AppButton
					data-testid="back-button"
					disabled={backDisabled}
					leftIcon={<Image alt="Go back" height={15} src="/icons/go-back.svg" width={15} />}
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
			const projectPath = PagePath.PROJECT_DETAIL.replace(":projectId", application.project_id);
			router.push(projectPath);
		} else {
			router.push(PagePath.PROJECTS);
		}
	};

	return (
		<header className="w-full border-b-1 border-gray-100 p-4 sm:p-6" data-testid="wizard-header">
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
					className="py-0 text-sm sm:text-base text-primary"
					data-testid="exit-button"
					onClick={handleExit}
					size="lg"
					variant="link"
				>
					{isFirstStep ? "Exit" : "Save and Exit"}
				</AppButton>
			</div>
			<div className="space-y-2">
				<ApplicationProgressBar currentStep={currentStep} stepTitles={WIZARD_STEP_ORDER} />
				<ProgressTitles currentStep={currentStep} stepTitles={WIZARD_STEP_ORDER} />
			</div>
		</header>
	);
}

function ApplicationProgressBar({ currentStep, stepTitles }: { currentStep: WizardStep; stepTitles: WizardStep[] }) {
	const currentStepIndex = stepTitles.indexOf(currentStep);

	return (
		<div className="flex justify-center">
			<div
				aria-label="Application wizard progress"
				aria-valuemax={stepTitles.length}
				aria-valuemin={1}
				aria-valuenow={currentStepIndex + 1}
				className="flex w-full flex-col items-center px-16 sm:px-4"
				data-testid="step-indicators"
				role="progressbar"
			>
				<div className="relative flex w-full justify-center px-4 sm:px-20">
					{stepTitles.map((_title: WizardStep, index: number) => {
						const isLastStep = index === stepTitles.length - 1;
						const indicatorType = getStepIndicatorType(index, currentStepIndex);

						return (
							<div
								aria-current={index === currentStepIndex ? "step" : undefined}
								className={`${isLastStep ? "w-auto flex-initial" : "flex-1"} relative flex flex-col items-center`}
								data-testid={`step-${index}`}
								key={index}
							>
								<div className={`flex items-center ${isLastStep ? "" : "w-full"} relative`}>
									<StepIndicator isLastStep={isLastStep} type={indicatorType} />
								</div>
							</div>
						);
					})}
				</div>
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
			const deadline = new Date(submissionDate);
			const formattedDate = format(deadline, "MM/dd/yyyy");
			return `Deadline passed (${formattedDate})`;
		}

		return formatTimeRemaining(diffTime);
	};

	const timeRemaining = getTimeRemaining();

	return (
		<div
			className="rounded-xs bg-surface-secondary relative box-border flex w-full flex-row items-center justify-center gap-0.5 px-2 py-1 text-sm text-text-primary"
			data-testid="deadline-component"
		>
			<Image alt="Deadline" height={16} src="/icons/deadline.svg" width={16} />
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
				return <Image alt="Approve" height={16} src="/icons/approve.svg" width={16} />;
			}
			if (isGenerateStep) {
				return <Image alt="Generate" height={16} src="/icons/button-logo.svg" width={16} />;
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
		rightIcon: isGenerateStep ? undefined : (
			<Image alt="Go ahead" height={15} src="/icons/go-ahead.svg" width={15} />
		),
	};
}

function getStepIndicatorType(index: number, currentStepIndex: number): IndicatorStatus {
	if (index < currentStepIndex) {
		return "done";
	}
	if (index === currentStepIndex) {
		return "active";
	}
	return "inactive";
}

function getStepTitleClass(index: number, currentStepIndex: number) {
	if (index < currentStepIndex) {
		return "text-app-dark-blue";
	}
	if (index === currentStepIndex) {
		return "text-primary";
	}
	return "text-app-gray-400";
}

function ProgressTitles({ currentStep, stepTitles }: { currentStep: WizardStep; stepTitles: WizardStep[] }) {
	const currentStepIndex = stepTitles.indexOf(currentStep);

	return (
		<div className="flex justify-center mt-2">
			<div className="flex w-full items-center">
				<div className="relative flex w-full justify-between gap-0 lg:gap-4 xl:gap-25 ps-4 lg:ps-0">
					{stepTitles.map((title: WizardStep, index: number) => {
						const titleClass = getStepTitleClass(index, currentStepIndex);

						return (
							<div
								className={"flex-1 relative flex flex-col items-center justify-stretch min-w-0"}
								data-testid={`step-title-${index}`}
								key={index}
							>
								<div className={"flex items-center relative justify-center w-full"}>
									<span
										aria-hidden="true"
										className={`font-heading font-semibold text-center text-sm sm:text-base truncate max-w-10 md:max-w-15 lg:max-w-30 xl:max-w-full ${titleClass}`}
										data-testid={`step-title-text-${index}`}
									>
										{title}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
