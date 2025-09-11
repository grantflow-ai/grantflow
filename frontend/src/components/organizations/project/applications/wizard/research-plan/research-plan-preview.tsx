"use client";

import type { RefObject } from "react";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useObjectiveManagement } from "@/hooks/use-objective-management";
import { useApplicationStore } from "@/stores/application-store";
import { type Objective, useWizardStore } from "@/stores/wizard-store";
import { ObjectiveList } from "./objective-list";

interface ResearchPlanPreviewProps {
	dialogRef: RefObject<null | WizardDialogRef>;
}

const handleReorder = async (objectives: Objective[], oldIndex: number, newIndex: number) => {
	const reorderedObjectives = [...objectives];
	const [movedObjective] = reorderedObjectives.splice(oldIndex, 1);
	reorderedObjectives.splice(newIndex, 0, movedObjective);
	await useWizardStore.getState().updateObjectives(reorderedObjectives);
};

export function ResearchPlanPreview({ dialogRef }: ResearchPlanPreviewProps) {
	const objectives = useApplicationStore((state) => state.application?.research_objectives) ?? [];

	const { editingObjectiveId, handleEdit, handleRemoveClick, handleSaveObjective, setEditingObjectiveId } =
		useObjectiveManagement(dialogRef);

	if (objectives.length === 0) {
		return (
			<WizardRightPane padding="p-6">
				<div className="flex h-full flex-col" data-testid="empty-state">
					<EmptyStatePreview />
				</div>
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="p-6">
			<ObjectiveList
				editingObjectiveId={editingObjectiveId}
				objectives={objectives}
				onEdit={handleEdit}
				onRemove={handleRemoveClick}
				onReorder={handleReorder}
				onSave={handleSaveObjective}
				setEditingObjectiveId={setEditingObjectiveId}
			/>
		</WizardRightPane>
	);
}
