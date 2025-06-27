import { useEffect } from "react";

import { useWizardStore } from "@/stores/wizard-store";

export function usePollingCleanup() {
	const { polling, setGeneratingTemplate } = useWizardStore((state) => ({
		polling: state.polling,
		setGeneratingTemplate: state.setGeneratingTemplate,
	}));

	useEffect(() => {
		return () => {
			polling.stop();
			setGeneratingTemplate(false);
		};
	}, [polling.stop, setGeneratingTemplate]);
}
