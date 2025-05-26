"use client";

import React, { useState } from "react";
import { AppButton } from "@/components/app-button";
import { IconGoAhead, IconGoBack } from "@/components/icons";
import { IconApprove, IconButtonLogo, IconDeadline } from "@/components/workspaces/icons";
import { WizardStepIndicators } from "@/components/workspaces/wizard-step-indicators";

const steps = [
	<div className="p-4" key={0}>
		<h2 className="text-2xl font-bold mb-4">Application Details</h2>
		<p>Step 1: Enter your application details here</p>
	</div>,
	<div className="p-4" key={1}>
		<h2 className="text-2xl font-bold mb-4">Preview and Approve</h2>
		<p>Step 2: Review and approve your application</p>
	</div>,
	<div className="p-4" key={2}>
		<h2 className="text-2xl font-bold mb-4">Knowledge Base</h2>
		<p>Step 3: Set up your knowledge base</p>
	</div>,
	<div className="p-4" key={3}>
		<h2 className="text-2xl font-bold mb-4">Research Plan</h2>
		<p>Step 4: Define your research plan</p>
	</div>,
	<div className="p-4" key={4}>
		<h2 className="text-2xl font-bold mb-4">Research Deep Dive</h2>
		<p>Step 5: Conduct in-depth research</p>
	</div>,
	<div className="p-4" key={5}>
		<h2 className="text-2xl font-bold mb-4">Generate and Complete</h2>
		<p>Step 6: Finalize and complete your application</p>
	</div>,
];

const wizardStepTitles = [
	"Application Details",
	"Application Structure",
	"Knowledge Base",
	"Research Plan",
	"Research Deep Dive",
	"Generate and Complete",
];

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

function WizardFooter({
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
	const isApproveButton = currentStep === 1;
	const isGenerateButton = currentStep === 5;
	const leftIcon = isApproveButton ? <IconApprove /> : isGenerateButton ? <IconButtonLogo /> : undefined;
	const rightIcon = isGenerateButton ? undefined : <IconGoAhead />;

	let rightButtonText = "Next";
	if (isApproveButton) {
		rightButtonText = "Approve and Continue";
	} else if (isGenerateButton) {
		rightButtonText = "Generate";
	}

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
				theme="dark"
				variant="primary"
			>
				{rightButtonText}
			</AppButton>
		</footer>
	);
}

function WizardHeader({ currentStep }: { currentStep: number }) {
	return (
		<header className="w-full border-app-lavender-gray border-solid border-b p-6" data-testid="wizard-header">
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center space-x-2">
					<h1 className="text-nowrap" data-testid="app-name">
						Application name
					</h1>
					<Deadline />
				</div>
				<AppButton className="text-base py-0" data-testid="save-exit-button" size="lg" variant="link">
					Save and Exit
				</AppButton>
			</div>
			<WizardStepIndicators currentStep={currentStep} stepTitles={wizardStepTitles} />
		</header>
	);
}

function WizardPage({ initialStep = 0 }: { initialStep?: number }) {
	const [currentStep, setCurrentStep] = useState<number>(initialStep);

	const handleBack = () => {
		setCurrentStep((s) => Math.max(0, s - 1));
	};

	const handleNext = () => {
		setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
	};

	return (
		<div className="flex flex-col bg-light h-screen w-screen" data-testid="wizard-page">
			<WizardHeader currentStep={currentStep} />
			<section className="flex-1 overflow-auto p-6" data-testid="step-content-container">
				{steps[currentStep]}
			</section>
			<WizardFooter
				currentStep={currentStep}
				onBack={handleBack}
				onContinue={handleNext}
				showBack={currentStep > 0}
			/>
		</div>
	);
}

export default WizardPage;
