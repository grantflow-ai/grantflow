"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import type { RefObject } from "react";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ObjectiveForm, type ObjectiveFormData } from "./objective-form";
import { PreviewLoadingComponent } from "./preview-loading";
import { ResearchPlanPreview } from "./research-plan-preview";

export const MAX_OBJECTIVES = 5;

interface ResearchPlanStepProps {
	dialogRef: RefObject<null | WizardDialogRef>;
}

export function ResearchPlanStep({ dialogRef }: ResearchPlanStepProps) {
	const application = useApplicationStore((state) => state.application);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_plan);
	const showResearchPlanInfoBanner = useWizardStore((state) => state.showResearchPlanInfoBanner);
	const setShowResearchPlanInfoBanner = useWizardStore((state) => state.setShowResearchPlanInfoBanner);
	const { trackContentAdd } = useWizardAnalytics();

	const [showObjectiveForm, setShowObjectiveForm] = useState(false);

	const objectives = application?.research_objectives ?? [];

	const handleSaveObjective = async (data: ObjectiveFormData) => {
		const objective = {
			description: data.description,
			number: objectives.length + 1,
			research_tasks: data.tasks.map((task, index) => ({
				description: task.description,
				number: index + 1,
				title: "",
			})),
			title: data.name,
		};

		await trackContentAdd("objective", data.name);

		try {
			await useWizardStore.getState().createObjective(objective);
		} catch {}

		setShowObjectiveForm(false);
	};

	return (
		<div className="flex size-full" data-testid="research-plan-step">
			<WizardLeftPane testId="research-plan-left-pane">
				<div className="space-y-1">
					<div className="flex items-center justify-between gap-4">
						<h2
							className="font-heading text-lg md:text-xl lg:text-2xl font-medium"
							data-testid="research-plan-header"
						>
							Research plan
						</h2>
						{}
					</div>
					<p className="text-muted-foreground-dark leading-tight" data-testid="research-plan-description">
						Define your key objectives and break them into actionable tasks. This structure forms the
						backbone of your application.
					</p>
				</div>

				{showResearchPlanInfoBanner && objectives.length >= MAX_OBJECTIVES && (
					<ResearchPlanInfoBanner
						onClose={() => {
							setShowResearchPlanInfoBanner(false);
						}}
					/>
				)}

				<div className="space-y-4">
					{!showObjectiveForm && (
						<AppButton
							data-testid="add-objective-button"
							disabled={objectives.length >= MAX_OBJECTIVES}
							leftIcon={<Plus size={16} />}
							onClick={() => {
								setShowObjectiveForm(true);
							}}
							variant="secondary"
						>
							{objectives.length === 0 ? "Add First Objective" : "Add Objective"}
						</AppButton>
					)}

					{showObjectiveForm && (
						<ObjectiveForm
							className="px-3 pb-3"
							objectiveNumber={objectives.length + 1}
							onSaveAction={handleSaveObjective}
						/>
					)}
				</div>
			</WizardLeftPane>

			{isAutofillLoading ? <PreviewLoadingComponent /> : <ResearchPlanPreview dialogRef={dialogRef} />}
		</div>
	);
}

function ResearchPlanInfoBanner({ onClose }: { onClose: () => void }) {
	return (
		<div className="self-stretch p-2 bg-slate-100 rounded outline-1 outline-offset-[-1px] outline-slate-400 inline-flex justify-start items-start gap-1">
			<Image alt="Info" className="shrink-0" height={16} src="/icons/icon-toast-info.svg" width={16} />
			<div className="flex-1 grow text-sm text-app-black font-normal leading-tight">
				You can add up to a maximum of 5 objectives for your grant application.
			</div>
			<button aria-label="Close info banner" className="shrink-0 self-start" onClick={onClose} type="button">
				<Image
					alt="Close"
					className="hover:opacity-60 transition-opacity cursor-pointer"
					height={16}
					src="/icons/close.svg"
					width={16}
				/>
			</button>
		</div>
	);
}
