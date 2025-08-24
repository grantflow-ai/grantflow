"use client";

import type { RefObject } from "react";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useObjectiveManagement } from "@/hooks/use-objective-management";
import { type Objective, useApplicationStore, useWizardStore } from "@/stores";
import { WizardRightPane } from "../shared";
import { ObjectiveList } from "../shared/objective-list";
import type { WizardDialogRef } from "../shared/wizard-dialog";

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
