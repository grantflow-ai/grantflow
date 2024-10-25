"use client";

import { useState } from "react";
import { Step, Stepper } from "@/components/stepper";
import { GrantCFP } from "@/types/database-types";
import { GeneralInfoForm } from "@/components/applications/general-info-form";
import SignificanceAndInnovationForm from "@/components/applications/significance-and-innovation-form";
import { ResearchAimsForm } from "@/components/applications/research-aims-form";
import { useWizardStore, WizardStoreInit } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";

const steps: Step[] = [
	{ index: 1, name: "General Information" },
	{ index: 2, name: "Significance and Innovation" },
	{ index: 3, name: "Research Plan" },
	{ index: 4, name: "Review" },
];

export function WizardFormPage({
	cfps,
	...storeInit
}: {
	cfps: GrantCFP[];
} & Pick<WizardStoreInit, "workspaceId"> &
	Partial<WizardStoreInit>) {
	const { application, significance, innovation, workspaceId, researchAims, researchTasks } = useWizardStore(
		storeInit,
	)(
		useShallow((store) => ({
			application: store.application,
			significance: store.significance,
			innovation: store.innovation,
			workspaceId: store.workspaceId,
			researchAims: store.researchAims,
			researchTasks: store.researchTasks,
		})),
	);

	const [currentStep, setCurrentStep] = useState(1);

	const handleStepClick = (step: number) => {
		setCurrentStep(step);
	};

	const handleNext = () => {
		if (currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	return (
		<div className="container">
			<section className="">
				<h1 className="pt-5 text-2xl bold">Grant Application Wizard</h1>
			</section>
			<div className="flex flex-col gap-4 py-5">
				<Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
				{currentStep === 1 && (
					<GeneralInfoForm cfps={cfps} workspaceId={workspaceId} onPressNext={handleNext} />
				)}
				{application && currentStep === 2 && (
					<SignificanceAndInnovationForm
						workspaceId={workspaceId}
						onPressNext={handleNext}
						onPressPrevious={handlePrevious}
					/>
				)}
				{application && significance && innovation && currentStep === 3 && (
					<ResearchAimsForm workspaceId={workspaceId} applicationId={application.id} />
				)}
				{application &&
					significance &&
					innovation &&
					researchAims.length &&
					researchTasks.length &&
					currentStep === 4 && (
						<div>
							<h3 className="text-lg font-semibold mb-4">Review Your Information</h3>
							<p>Please review all the information you&apos;ve entered before submitting.</p>
						</div>
					)}
			</div>
		</div>
	);
}
