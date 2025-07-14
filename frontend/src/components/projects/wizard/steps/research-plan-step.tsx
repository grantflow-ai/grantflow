"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardLeftPane } from "@/components/projects/wizard/shared";
import { ObjectiveForm, type ObjectiveFormData } from "@/components/projects/wizard/shared/objective-form";
import { PreviewLoadingComponent } from "@/components/projects/wizard/shared/preview-loading";
import { ResearchPlanPreview } from "@/components/projects/wizard/steps/research-plan-preview";
import { useApplicationStore } from "@/stores/application-store";
import { MAX_OBJECTIVES, useWizardStore } from "@/stores/wizard-store";

export function ResearchPlanStep() {
	const application = useApplicationStore((state) => state.application);
	const addObjective = useWizardStore((state) => state.addObjective);
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_plan);
	const showResearchPlanInfoBanner = useWizardStore((state) => state.showResearchPlanInfoBanner);
	const setShowResearchPlanInfoBanner = useWizardStore((state) => state.setShowResearchPlanInfoBanner);

	const [showObjectiveForm, setShowObjectiveForm] = useState(false);

	const objectives = application?.research_objectives ?? [];

	const handleAddObjectiveClick = () => {
		setShowObjectiveForm(true);
	};

	const handleSaveObjective = (data: ObjectiveFormData) => {
		// Convert ObjectiveFormData to the format expected by the store
		const objective = {
			description: data.description,
			number: objectives.length + 1, // This will be overridden by addObjective, but required by type
			research_tasks: data.tasks.map((task, index) => ({
				description: task.description,
				number: index + 1,
				title: "", // Required by the task type but not used in our form
			})),
			title: data.name,
		};

		addObjective(objective);
		setShowObjectiveForm(false);
	};

	return (
		<div className="flex size-full" data-testid="research-plan-step">
			<WizardLeftPane testId="research-plan-left-pane">
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-4">
						<h2
							className="font-heading text-lg md:text-xl lg:text-2xl font-medium"
							data-testid="research-plan-header"
						>
							Research plan
						</h2>
						<AppButton
							className="shrink-0"
							data-testid="ai-try-button"
							disabled={isAutofillLoading || !application}
							leftIcon={<Image alt="AI Try" height={16} src="/icons/button-logo.svg" width={16} />}
							onClick={() => triggerAutofill("research_plan")}
							variant="secondary"
						>
							{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
						</AppButton>
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
							onClick={handleAddObjectiveClick}
							variant="secondary"
						>
							{objectives.length === 0 ? "Add First Objective" : "Add Objective"}
						</AppButton>
					)}

					{showObjectiveForm && (
						<ObjectiveForm objectiveNumber={objectives.length + 1} onSaveAction={handleSaveObjective} />
					)}
				</div>
			</WizardLeftPane>

			{isAutofillLoading ? <PreviewLoadingComponent /> : <ResearchPlanPreview />}
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
