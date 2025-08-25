"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { type Objective, useWizardStore } from "@/stores/wizard-store";

export interface ObjectiveManagement {
	editingObjectiveId: null | number;
	handleEdit: (objectiveNumber: number) => void;
	handleRemoveClick: (objective: Objective) => void;
	handleSaveObjective: (updatedObjective: Objective) => Promise<void>;
	setEditingObjectiveId: (id: null | number) => void;
}

export function useObjectiveManagement(dialogRef: RefObject<null | WizardDialogRef>): ObjectiveManagement {
	const [editingObjectiveId, setEditingObjectiveId] = useState<null | number>(null);

	const updateObjective = useWizardStore((state) => state.updateObjective);
	const removeObjective = useWizardStore((state) => state.removeObjective);

	const handleEdit = (objectiveNumber: number) => {
		setEditingObjectiveId(objectiveNumber);
	};

	const handleRemoveClick = (objective: Objective) => {
		const handleConfirmDelete = async () => {
			await removeObjective(objective.number);
			dialogRef.current?.close();
		};

		const handleCancelDelete = () => {
			dialogRef.current?.close();
		};

		const footer = (
			<div className="flex justify-between w-full">
				<AppButton
					data-testid="cancel-delete-button"
					onClick={handleCancelDelete}
					type="button"
					variant="secondary"
				>
					Cancel
				</AppButton>
				<AppButton
					data-testid="confirm-delete-button"
					onClick={handleConfirmDelete}
					type="button"
					variant="primary"
				>
					Delete Objective
				</AppButton>
			</div>
		);

		dialogRef.current?.open({
			content: null,
			description:
				"All content within this objective and all its associated tasks will be permanently removed. This action cannot be undone.",
			dismissOnOutsideClick: false,
			footer,
			minWidth: "min-w-xl",
			title: "Are you sure you want to delete this objective?",
		});
	};

	const handleSaveObjective = async (updatedObjective: Objective) => {
		await updateObjective(updatedObjective.number, updatedObjective);
		setEditingObjectiveId(null);
	};

	return {
		editingObjectiveId,
		handleEdit,
		handleRemoveClick,
		handleSaveObjective,
		setEditingObjectiveId,
	};
}
