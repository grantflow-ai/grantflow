import { useEffect } from "react";

import { useWizardStore } from "@/stores/wizard-store";

export function usePollingCleanup() {
	const stopPolling = useWizardStore((state) => state.polling.stop);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);

	useEffect(() => {
		return () => {
			stopPolling();
			setGeneratingTemplate(false);
		};
	}, [stopPolling, setGeneratingTemplate]);
}
