import { useEffect } from "react";

import { useWizardStore } from "@/stores/wizard-store";

export function usePollingCleanup() {
	const polling = useWizardStore((state) => state.polling);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);

	useEffect(() => {
		return () => {
			polling.stop();
			setGeneratingTemplate(false);
		};
	}, [polling, setGeneratingTemplate]);
}