"use client";

import React, { useState } from "react";
import { WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";

const steps = [
	<div className="p-4" data-testid="container-for-step-1" key={0}>
		<h2 className="text-2xl font-bold mb-4">Application Details</h2>
		<p>Step 1: Enter your application details here</p>
	</div>,
	<div className="p-4" data-testid="container-for-step-2" key={1}>
		<h2 className="text-2xl font-bold mb-4">Preview and Approve</h2>
		<p>Step 2: Review and approve your application</p>
	</div>,
	<div className="p-4" data-testid="container-for-step-3" key={2}>
		<h2 className="text-2xl font-bold mb-4">Knowledge Base</h2>
		<p>Step 3: Set up your knowledge base</p>
	</div>,
	<div className="p-4" data-testid="container-for-step-4" key={3}>
		<h2 className="text-2xl font-bold mb-4">Research Plan</h2>
		<p>Step 4: Define your research plan</p>
	</div>,
	<div className="p-4" data-testid="container-for-step-5" key={4}>
		<h2 className="text-2xl font-bold mb-4">Research Deep Dive</h2>
		<p>Step 5: Conduct in-depth research</p>
	</div>,
	<div className="p-4" data-testid="container-for-step-6" key={5}>
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

function WizardPage({ initialStep = 0, showHeaderInfo = false }: { initialStep: number; showHeaderInfo?: boolean }) {
	const [currentStep, setCurrentStep] = useState<number>(initialStep);

	const handleBack = () => {
		setCurrentStep((s) => Math.max(0, s - 1));
	};

	const handleNext = () => {
		setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
	};

	return (
		<div className="flex flex-col bg-light h-screen w-screen" data-testid="wizard-page">
			<WizardHeader
				applicationName="Application Name"
				currentStep={currentStep}
				showHeaderInfo={showHeaderInfo}
				stepTitles={wizardStepTitles}
			/>
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
