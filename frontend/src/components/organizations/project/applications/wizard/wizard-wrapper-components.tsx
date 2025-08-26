"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app/buttons/app-button";
import { ThemeBadge } from "@/components/shared/theme-badge";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { MIN_TITLE_LENGTH, useWizardStore } from "@/stores/wizard-store";
import { routes } from "@/utils/navigation";
import { Deadline } from "./deadline";

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
	const router = useRouter();
	const currentStep = useWizardStore((state) => state.currentStep);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const isGeneratingApplication = useWizardStore((state) => state.isGeneratingApplication);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const validateStepNext = useWizardStore((state) => state.validateStepNext);

	const title = useApplicationStore((state) => state.application?.title);
	const applicationText = useApplicationStore((state) => state.application?.text);
	const ragSources = useApplicationStore((state) => state.application?.grant_template?.rag_sources);

	const showBack = currentStep !== WizardStep.APPLICATION_DETAILS;
	const isApplicationDetailsStep = currentStep === WizardStep.APPLICATION_DETAILS;
	const backDisabled = currentStep === WizardStep.APPLICATION_STRUCTURE && isGeneratingTemplate;

	const localValidation = isApplicationDetailsStep
		? !!(title && title.trim().length >= MIN_TITLE_LENGTH && ragSources && ragSources.length > 0)
		: true;
	const hasApplicationText = !!(applicationText && applicationText.trim().length > 0);

	const getButtonDisabledState = () => {
		if (currentStep === WizardStep.RESEARCH_DEEP_DIVE) {
			return isGeneratingApplication || !(validateStepNext() && localValidation);
		}

		return !(validateStepNext() && localValidation);
	};

	const disabled = getButtonDisabledState();

	const { leftIcon, rightButtonText, rightIcon } = generateFooterRightButtonProps(
		currentStep,
		disabled,
		hasApplicationText,
	);

	const handleRightButtonClick = async () => {
		if (currentStep === WizardStep.RESEARCH_DEEP_DIVE) {
			if (hasApplicationText) {
				useWizardStore.getState().toNextStep();
				return;
			}

			const success = await useWizardStore.getState().generateApplication();
			if (success) {
				useWizardStore.getState().toNextStep();
			}
			return;
		}

		if (currentStep === WizardStep.GENERATE_AND_COMPLETE) {
			router.push(routes.organization.root());
			useWizardStore.getState().reset();
			return;
		}

		useWizardStore.getState().toNextStep();
	};

	return (
		<footer
			className="relative flex h-auto w-full items-center justify-between border-t-1 border-gray-100 bg-surface-primary p-6"
			data-testid="wizard-footer"
		>
			{showBack ? (
				<AppButton
					data-testid="back-button"
					disabled={backDisabled}
					leftIcon={styledIcon(
						<Image alt="Go back" height={15} src="/icons/go-back.svg" width={15} />,
						backDisabled,
					)}
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
				onClick={handleRightButtonClick}
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
		router.push(routes.organization.project.detail());
	};

	return (
		<header className="w-full border-b-1 border-gray-100 p-4 sm:p-6" data-testid="wizard-header">
			<div className="flex items-center justify-between mb-6 sm:mb-8">
				<div className="flex min-h-7 items-center space-x-2">
					<ThemeBadge
						color="betaBadge"
						leftIcon={<Image alt="Beta logo" height={16} src="/icons/button-logo-white.svg" width={16} />}
					>
						<span className="relative top-[0.5px]">BETA</span>
					</ThemeBadge>
					{showHeaderInfo ? (
						<>
							<h1
								className="text-sm sm:text-base text-nowrap text-app-black"
								data-testid="app-name"
								title={application?.title}
							>
								{application?.title && application.title.length > 120
									? `${application.title.slice(0, 120)}...`
									: application?.title}
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
								data-testid={`step-${index}${indicatorType === "active" ? " step-active" : ""}`}
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

function generateFooterRightButtonProps(currentStep: WizardStep, disabled?: boolean, hasApplicationText?: boolean) {
	const isApproveStep = currentStep === WizardStep.APPLICATION_STRUCTURE;
	const isResearchDeepDiveStep = currentStep === WizardStep.RESEARCH_DEEP_DIVE;
	const isGenerateStep = currentStep === WizardStep.GENERATE_AND_COMPLETE;

	const shouldShowGenerate = isResearchDeepDiveStep && !hasApplicationText;

	return {
		leftIcon: (() => {
			if (isApproveStep) {
				return styledIcon(<Image alt="Approve" height={16} src="/icons/approve.svg" width={16} />, disabled);
			}
			if (shouldShowGenerate) {
				return styledIcon(
					<Image alt="Generate" height={16} src="/icons/button-logo-white.svg" width={16} />,
					disabled,
				);
			}
			return undefined;
		})(),
		rightButtonText: (() => {
			if (isApproveStep) {
				return "Approve and Continue";
			}
			if (shouldShowGenerate) {
				return "Generate";
			}
			if (isGenerateStep) {
				return "Go To Dashboard";
			}
			return "Next";
		})(),
		rightIcon: shouldShowGenerate
			? undefined
			: styledIcon(<Image alt="Go ahead" height={15} src="/icons/go-ahead-white.svg" width={15} />, disabled),
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

function styledIcon(icon: React.ReactElement, disabled?: boolean) {
	if (!disabled) return icon;

	return (
		<div className="[&>img]:filter [&>img]:[filter:brightness(0)_saturate(100%)_invert(84%)_sepia(8%)_saturate(221%)_hue-rotate(180deg)_brightness(95%)_contrast(87%)]">
			{icon}
		</div>
	);
}
