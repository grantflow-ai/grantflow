import { useEffect } from "react";

import { useWizardStore } from "@/stores/wizard-store";

export function usePollingCleanup() {
	const stop = useWizardStore((state) => state.polling.stop);

	useEffect(() => {
		return () => {
			stop();
		};
	}, [stop]);
}
