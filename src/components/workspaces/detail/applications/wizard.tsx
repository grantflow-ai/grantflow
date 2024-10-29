"use client";

import { useCallback, useMemo, useState } from "react";
import { Step, Stepper } from "@/components/stepper";
import { GrantCFP } from "@/types/database-types";
import { GeneralInfoForm } from "@/components/workspaces/detail/applications/general-info-form";
import SignificanceAndInnovationForm from "@/components/workspaces/detail/applications/significance-and-innovation-form";
import { useWizardStore, WizardStoreInit } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { ReviewApplicationForm } from "@/components/workspaces/detail/applications/review-application-form";
import { ResearchPlanForm } from "@/components/workspaces/detail/applications/research-plan-form";

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

	const handleStepClick = useCallback((step: number) => {
		setCurrentStep(step);
	}, []);

	const handleNext = useCallback(() => {
		if (currentStep < steps.length) {
			setCurrentStep((prevStep) => prevStep + 1);
		}
	}, [currentStep, steps.length]);

	const handlePrevious = useCallback(() => {
		if (currentStep > 1) {
			setCurrentStep((prevStep) => prevStep - 1);
		}
	}, [currentStep]);

	const applicationId = useMemo(() => application?.id, [application]);
	const hasSignificanceAndInnovation = useMemo(() => !!significance && !!innovation, [significance, innovation]);

	const hasResearchPlan = useMemo(() => {
		if (!researchAims.length || researchTasks.length) {
			return false;
		}
		for (const researchAim of researchAims) {
			const tasks = researchTasks.filter((task) => task.aimId === researchAim.id);
			if (!tasks.length) {
				return false;
			}
		}
		return true;
	}, [researchAims, researchTasks]);

	return (
		<div className="flex flex-col gap-4 py-5">
			<Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
			{currentStep === 1 && <GeneralInfoForm cfps={cfps} workspaceId={workspaceId} onPressNext={handleNext} />}
			{applicationId && currentStep === 2 && (
				<SignificanceAndInnovationForm
					workspaceId={workspaceId}
					applicationId={applicationId}
					onPressNext={handleNext}
					onPressPrevious={handlePrevious}
				/>
			)}
			{hasSignificanceAndInnovation && applicationId && currentStep === 3 && (
				<ResearchPlanForm
					workspaceId={workspaceId}
					applicationId={applicationId}
					onPressNext={handleNext}
					onPressPrevious={handlePrevious}
				/>
			)}
			{hasSignificanceAndInnovation && hasResearchPlan && currentStep === 4 && <ReviewApplicationForm />}
		</div>
	);
}
