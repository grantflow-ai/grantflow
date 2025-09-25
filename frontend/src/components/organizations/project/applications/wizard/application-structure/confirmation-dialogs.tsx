import type React from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";

interface ConfirmationDialogConfig {
	cancelButtonText?: string;
	confirmButtonText: string;
	description: string;
	onCancel?: () => void;
	onConfirm: () => Promise<void> | void;
	title: string;
}

export const openConfirmationDialog = (
	dialogRef: React.RefObject<null | WizardDialogRef>,
	config: ConfirmationDialogConfig,
): void => {
	const { cancelButtonText = "Cancel", confirmButtonText, description, onCancel, onConfirm, title } = config;

	const handleConfirm = async () => {
		dialogRef.current?.close();
		await onConfirm();
	};

	const handleCancel = () => {
		dialogRef.current?.close();
		onCancel?.();
	};

	dialogRef.current?.open({
		content: null,
		description,
		dismissOnOutsideClick: false,
		footer: (
			<div className="flex justify-between w-full">
				<AppButton data-testid="cancel-move-button" onClick={handleCancel} variant="secondary">
					{cancelButtonText}
				</AppButton>
				<AppButton data-testid="confirm-move-button" onClick={handleConfirm} variant="primary">
					{confirmButtonText}
				</AppButton>
			</div>
		),
		minWidth: "min-w-xl",
		title,
	});
};

export const SECTION_MOVE_DIALOG_CONFIG: Omit<ConfirmationDialogConfig, "onCancel" | "onConfirm"> = {
	confirmButtonText: "Convert and Remove",
	description:
		"Converting a main section into a secondary section will permanently remove any associated secondary sections, if they exist. This action cannot be undone.",
	title: "This action will affect the section structure!",
};

export const createDeleteDialogConfig = (
	hasSubSections: boolean,
): Omit<ConfirmationDialogConfig, "onCancel" | "onConfirm"> => ({
	confirmButtonText: "Delete Section",
	description: hasSubSections
		? "All content within this section and its sub-sections will be permanently removed. This action cannot be undone."
		: "All content within this section will be permanently removed. This action cannot be undone.",
	title: "Are you sure you want to delete this section?",
});
