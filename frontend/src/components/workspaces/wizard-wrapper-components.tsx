import {
	IconApplicationStepActive,
	IconApplicationStepDone,
	IconApplicationStepInActive,
	IconApprove,
	IconButtonLogo,
	IconDeadline,
} from "@/components/workspaces/icons";
import { AppButton } from "@/components/app-button";
import { IconGoAhead, IconGoBack } from "@/components/icons";
import React from "react";

export function WizardFooter({
	currentStep,
	onBack,
	onContinue,
	showBack,
}: {
	currentStep: number;
	onBack: () => void;
	onContinue: () => void;
	showBack: boolean;
}) {
	const { leftIcon, rightButtonText, rightIcon } = generateFooterRightButtonProps(currentStep);

	return (
		<footer
			className="w-full h-auto bg-white border-app-lavender-gray border-t p-6 flex justify-between items-center"
			data-testid="wizard-footer"
		>
			{showBack ? (
				<AppButton
					data-testid="back-button"
					leftIcon={<IconGoBack />}
					onClick={onBack}
					size="lg"
					theme="dark"
					variant="secondary"
				>
					Back
				</AppButton>
			) : (
				<div></div>
			)}
			<AppButton
				data-testid="continue-button"
				leftIcon={leftIcon}
				onClick={onContinue}
				rightIcon={rightIcon}
				size="lg"
				variant="primary"
			>
				{rightButtonText}
			</AppButton>
		</footer>
	);
}

export function WizardHeader({
	applicationName,
	currentStep,
	showHeaderInfo = true,
	stepTitles,
}: {
	applicationName: string;
	currentStep: number;
	showHeaderInfo?: boolean;
	stepTitles: string[];
}) {
	return (
		<header className="w-full border-app-lavender-gray border-solid border-b p-6" data-testid="wizard-header">
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center space-x-2 min-h-7">
					{showHeaderInfo ? (
						<>
							<h1 className="text-nowrap" data-testid="app-name">
								{applicationName}
							</h1>
							<Deadline />
						</>
					) : (
						<div className="invisible"></div>
					)}
				</div>
				<AppButton className="text-base py-0" data-testid="exit-button" size="lg" variant="link">
					Exit
				</AppButton>
			</div>
			<ApplicationProgressBar currentStep={currentStep} stepTitles={stepTitles} />
		</header>
	);
}

function ApplicationProgressBar({ currentStep, stepTitles }: { currentStep: number; stepTitles: string[] }) {
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

function Deadline() {
	return (
		<div
			className="relative rounded-xs bg-app-lavender-gray w-full flex flex-row items-center justify-center py-1 px-2 box-border gap-0.5 text-sm"
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
