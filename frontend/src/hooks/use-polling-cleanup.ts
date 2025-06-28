import { useEffect } from "react";

import { useWizardStore } from "@/stores/wizard-store";

export function usePollingCleanup() {
	useEffect(() => {
		return () => {
			useWizardStore.getState().polling.stop();
			useWizardStore.getState().setGeneratingTemplate(false);
		};
	}, []);
}
