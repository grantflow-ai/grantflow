"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { ThemeBadge } from "@/components/shared/theme-badge";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore, type ValidationResult } from "@/stores/wizard-store";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import { routes } from "@/utils/navigation";
import { Autosave } from "./autosave";
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

const STEP_ICONS: Record<IndicatorStatus, React.ReactElement> = {
	active: <Image alt="Step active" height={15} src="/icons/application-step-active.svg" width={15} />,
	done: <Image alt="Step done" height={15} src="/icons/application-step-done.svg" width={15} />,
	inactive: <Image alt="Step inactive" height={15} src="/icons/application-step-inactive.svg" width={15} />,
};

export function StepIndicator({ isLastStep, type }: { isLastStep: boolean; type: IndicatorStatus }) {
	if (isLastStep) {
		return (
			<div className="relative flex flex-row items-start justify-start" data-testid={`step-${type}`}>
				{STEP_ICONS[type]}
			</div>
		);
	}

	const lineClass = type === "done" ? "bg-primary" : "bg-app-gray-300";

	return (
		<div className="relative flex w-full flex-row items-center" data-testid={`step-${type}`}>
			<div className="relative flex justify-center">{STEP_ICONS[type]}</div>
			<div className={`flex-1 ${lineClass} h-px`} />
		</div>
	);
}

export function WizardFooter() {
	const currentStep = useWizardStore((state) => state.currentStep);

	return (
		<footer
			className="relative flex h-auto w-full items-center justify-between border-t-1 border-gray-100 bg-surface-primary p-6"
			data-testid="wizard-footer"
		>
			<LeftButton currentStep={currentStep} />
			<RightButton currentStep={currentStep} />
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
		router.push(routes.organization.project.detail());
		setTimeout(() => {
			reset();
		}, 1000);
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
							<Autosave />
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
					{isFirstStep ? "Exit" : "Close"}
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

function generateFooterRightButtonProps(currentStep: WizardStep, hasApplicationText?: boolean) {
	const isApproveStep = currentStep === WizardStep.APPLICATION_STRUCTURE;
	const isResearchDeepDiveStep = currentStep === WizardStep.RESEARCH_DEEP_DIVE;
	const isGenerateStep = currentStep === WizardStep.GENERATE_AND_COMPLETE;

	const shouldShowGenerate = isResearchDeepDiveStep && !hasApplicationText;

	return {
		leftIcon: (() => {
			if (isApproveStep) {
				return <Image alt="Approve" height={16} src="/icons/approve.svg" width={16} />;
			}
			if (shouldShowGenerate) {
				return <Image alt="Generate" height={16} src="/icons/button-logo-white.svg" width={16} />;
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
		rightIcon: shouldShowGenerate ? undefined : (
			<Image alt="Go ahead" height={15} src="/icons/go-ahead-white.svg" width={15} />
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

function getValidationErrorMessage(
	currentStep: WizardStep,
	title: string | undefined,
	ragSources: { status: string }[] | undefined,
): string {
	switch (currentStep) {
		case WizardStep.APPLICATION_DETAILS: {
			if (!title || title.length < 10) {
				return "Title must be at least 10 characters long";
			}
			if (!ragSources || ragSources.length === 0) {
				return "Please upload at least one document or URL";
			}
			return "Please ensure all requirements are met";
		}
		case WizardStep.APPLICATION_STRUCTURE: {
			return "Please ensure there are grant sections available";
		}
		case WizardStep.KNOWLEDGE_BASE: {
			return "Please add at least one knowledge source";
		}
		case WizardStep.RESEARCH_DEEP_DIVE: {
			return "Please fill in all required fields before proceeding";
		}
		case WizardStep.RESEARCH_PLAN: {
			return "Please add at least one research task to your objectives";
		}
		default: {
			return "Please ensure all requirements are met";
		}
	}
}

function LeftButton({ currentStep }: { currentStep: WizardStep }) {
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const { trackNavigation } = useWizardAnalytics();

	const showBack = currentStep !== WizardStep.APPLICATION_DETAILS;
	const backDisabled = currentStep === WizardStep.APPLICATION_STRUCTURE && isGeneratingTemplate;

	const handleBack = useCallback(async () => {
		await trackNavigation("back");
		toPreviousStep();
	}, [trackNavigation, toPreviousStep]);

	if (!showBack) {
		return <div />;
	}

	return (
		<AppButton
			data-testid="back-button"
			disabled={backDisabled}
			leftIcon={<Image alt="Go back" height={15} src="/icons/go-back.svg" width={15} />}
			onClick={handleBack}
			size="lg"
			theme="dark"
			variant="secondary"
		>
			Back
		</AppButton>
	);
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

function RightButton({ currentStep }: { currentStep: WizardStep }) {
	const router = useRouter();

	const validateStepNext = useWizardStore((state) => state.validateStepNext);

	const title = useApplicationStore((state) => state.application?.title);
	const applicationText = useApplicationStore((state) => state.application?.text);
	const ragSources = useApplicationStore((state) => state.application?.grant_template?.rag_sources);
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);

	const { trackEvent, trackNavigation } = useWizardAnalytics();

	const hasApplicationText = !!(applicationText && applicationText.trim().length > 0);

	const { leftIcon, rightButtonText, rightIcon } = useMemo(
		() => generateFooterRightButtonProps(currentStep, hasApplicationText),
		[currentStep, hasApplicationText],
	);

	const handleValidationError = useCallback(
		async (validation: ValidationResult) => {
			const errorDetails: string[] = [];
			if (!validation.isValid) {
				const reasonString = validation.reason.toLowerCase().replaceAll("_", "-");
				errorDetails.push(reasonString);
			}
			await trackNavigation("next", true, errorDetails);
		},
		[trackNavigation],
	);

	const handleStructureStep = useCallback(async () => {
		if (grantTemplate) {
			await trackEvent(WizardAnalyticsEvent.STEP_2_APPROVE, {
				sectionsCount: grantTemplate.grant_sections.length,
				templateId: grantTemplate.id,
			});
		}
		await trackNavigation("next");
		useWizardStore.getState().toNextStep();
	}, [grantTemplate, trackEvent, trackNavigation]);

	const handleDeepDiveStep = useCallback(async () => {
		if (hasApplicationText) {
			await trackNavigation("next");
			useWizardStore.getState().toNextStep();
			return;
		}

		await trackEvent(WizardAnalyticsEvent.STEP_5_GENERATE, {
			generationType: "application",
		});
		const success = await useWizardStore.getState().generateApplication();
		if (success) {
			useWizardStore.getState().toNextStep();
		}
	}, [hasApplicationText, trackEvent, trackNavigation]);

	const handleCompleteStep = useCallback(() => {
		router.push(routes.organization.root());
		setTimeout(() => {
			useWizardStore.getState().reset();
		}, 1000);
	}, [router]);

	const handleRightButtonClick = useCallback(async () => {
		const currentValidation = validateStepNext();
		if (!currentValidation.isValid) {
			await handleValidationError(currentValidation);
			const errorMessage = getValidationErrorMessage(currentStep, title, ragSources);
			toast.error(errorMessage);
			return;
		}

		switch (currentStep) {
			case WizardStep.APPLICATION_STRUCTURE: {
				await handleStructureStep();
				break;
			}
			case WizardStep.GENERATE_AND_COMPLETE: {
				handleCompleteStep();
				break;
			}
			case WizardStep.RESEARCH_DEEP_DIVE: {
				await handleDeepDiveStep();
				break;
			}
			default: {
				await trackNavigation("next");
				useWizardStore.getState().toNextStep();
			}
		}
	}, [
		currentStep,
		handleValidationError,
		handleStructureStep,
		handleDeepDiveStep,
		handleCompleteStep,
		trackNavigation,
		validateStepNext,
		ragSources,
		title,
	]);

	return (
		<AppButton
			data-testid="continue-button"
			leftIcon={leftIcon}
			onClick={handleRightButtonClick}
			rightIcon={rightIcon}
			size="lg"
			variant="primary"
		>
			{rightButtonText}
		</AppButton>
	);
}
