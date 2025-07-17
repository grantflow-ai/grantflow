import type * as React from "react";
import { useWizardStore } from "@/stores/wizard-store";

export function useWizardDialog() {
	const openDialog = useWizardStore((state) => state.openDialog);
	const closeDialog = useWizardStore((state) => state.closeDialog);
	const isOpen = useWizardStore((state) => state.dialog.isOpen);

	return {
		closeDialog,
		isOpen,
		openDialog: (
			title: string,
			content: React.ReactNode,
			options?: { description?: string; footer?: React.ReactNode },
		) => {
			openDialog(title, content, options);
		},
	};
}
