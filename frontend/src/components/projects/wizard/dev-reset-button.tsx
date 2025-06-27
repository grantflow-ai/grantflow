"use client";

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export function DevResetButton() {
	const currentStep = useWizardStore((state) => state.currentStep);
	const updateGrantSections = useApplicationStore((state) => state.updateGrantSections);

	const handleReset = async () => {
		try {
			if (currentStep !== WizardStep.PREVIEW_AND_APPROVE) {
				toast.info("Reset is only available for Step 2: Preview and Approve");
				return;
			}

			await updateGrantSections([]);
			toast.success("🔄 Grant sections reset successfully!");
		} catch {
			toast.error("Failed to reset grant sections");
		}
	};

	if (process.env.NODE_ENV === "production") {
		return null;
	}

	if (currentStep !== WizardStep.PREVIEW_AND_APPROVE) {
		return null;
	}

	return (
		<AppButton
			data-testid="dev-reset-button"
			leftIcon={<RotateCcw />}
			onClick={handleReset}
			size="sm"
			variant="secondary"
		>
			Reset Grant Sections
		</AppButton>
	);
}
