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
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";

const steps: Step[] = [
	{ index: 1, name: "General Information" },
	{ index: 2, name: "Significance and Innovation" },
	{ index: 3, name: "Research Plan" },
	{ index: 4, name: "Review" },
];

export function GrantApplicationWizard({
	cfps,
	...storeInit
}: {
	cfps: GrantCFP[];
} & Pick<WizardStoreInit, "workspaceId"> &
	Partial<WizardStoreInit>) {
	const router = useRouter();
	const { application, workspaceId } = useWizardStore(storeInit)(
		useShallow((store) => ({
			application: store.application,
			workspaceId: store.workspaceId,
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
		} else {
			router.push(PagePath.WORKSPACE_DETAIL.replace(":workspaceId", workspaceId));
		}
	}, [currentStep]);

	const applicationId = useMemo(() => application?.id, [application]);

	return (
		<div className="flex flex-col gap-4 py-5">
			<Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
			{currentStep === 1 && (
				<GeneralInfoForm
					cfps={cfps}
					workspaceId={workspaceId}
					onPressNext={handleNext}
					onPressPrevious={handlePrevious}
				/>
			)}
			{applicationId && currentStep === 2 && (
				<SignificanceAndInnovationForm
					workspaceId={workspaceId}
					applicationId={applicationId}
					onPressNext={handleNext}
					onPressPrevious={handlePrevious}
				/>
			)}
			{applicationId && currentStep === 3 && (
				<ResearchPlanForm
					workspaceId={workspaceId}
					applicationId={applicationId}
					onPressNext={handleNext}
					onPressPrevious={handlePrevious}
				/>
			)}
			{applicationId && currentStep === 4 && (
				<ReviewApplicationForm
					workspaceId={workspaceId}
					applicationId={applicationId}
					onPressPrevious={handlePrevious}
				/>
			)}
		</div>
	);
}
