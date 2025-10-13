"use client";

import React, { useCallback } from "react";
import { RagSourceUrlInput } from "@/components/shared/rag-source-url-input";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export function UrlInput({ parentId }: { parentId?: string }) {
	const addUrl = useApplicationStore((state) => state.addUrl);
	const application = useApplicationStore((state) => state.application);
	const currentStep = useWizardStore((state) => state.currentStep);
	const { trackLinkAdd } = useWizardAnalytics();

	const existingUrls = React.useMemo(() => {
		if (!application) return [];

		if (parentId === application.grant_template?.id) {
			return (application.grant_template?.rag_sources ?? [])
				.filter((source) => source.url)
				.map((source) => source.url!);
		}

		return application.rag_sources.filter((source) => source.url).map((source) => source.url!);
	}, [application, parentId]);

	const handleUrlAdd = useCallback(
		async (url: string) => {
			if (!parentId) {
				throw new Error("Cannot add URL: Parent ID missing");
			}

			const step = currentStep === WizardStep.APPLICATION_DETAILS ? 1 : 3;
			await trackLinkAdd(url, step);

			await addUrl(url, parentId);
		},
		[addUrl, currentStep, parentId, trackLinkAdd],
	);

	return <RagSourceUrlInput existingUrls={existingUrls} onUrlAdd={handleUrlAdd} testId="url-input" />;
}
