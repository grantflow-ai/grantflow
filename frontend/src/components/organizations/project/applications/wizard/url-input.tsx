"use client";

import Image from "next/image";
import React from "react";

import AppInput from "@/components/app/fields/input-field";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { isValidUrl } from "@/utils/validation";

export function UrlInput({ parentId }: { parentId?: string }) {
	const addUrl = useApplicationStore((state) => state.addUrl);
	const application = useApplicationStore((state) => state.application);
	const currentStep = useWizardStore((state) => state.currentStep);
	const { trackLinkAdd } = useWizardAnalytics();

	const urls = React.useMemo(() => {
		if (!application) return [];

		if (parentId === application.grant_template?.id) {
			return (application.grant_template?.rag_sources ?? [])
				.filter((source) => source.url)
				.map((source) => source.url!);
		}

		return application.rag_sources.filter((source) => source.url).map((source) => source.url!);
	}, [application, parentId]);

	const [urlInput, setUrlInput] = React.useState("");
	const [urlError, setUrlError] = React.useState<null | string>(null);

	const validateUrl = (url: string): null | string => {
		if (!isValidUrl(url)) {
			return "Please enter a valid URL";
		}
		if (!parentId) {
			return "Cannot add URL: Parent ID missing";
		}
		if (urls.includes(url)) {
			return "URL already exists";
		}
		return null;
	};

	const handleAddUrl = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter" || !urlInput.trim()) return;

		e.preventDefault();
		const trimmedUrl = urlInput.trim();

		const error = validateUrl(trimmedUrl);
		if (error) {
			setUrlError(error);
			if (error === "URL already exists") {
				setUrlInput("");
			}
			return;
		}

		setUrlError(null);
		const step = currentStep === WizardStep.APPLICATION_DETAILS ? 1 : 3;

		// Track the URL add attempt before calling addUrl so analytics is captured even if it fails
		await trackLinkAdd(trimmedUrl, step);

		try {
			await addUrl(trimmedUrl, parentId!);
			setUrlInput("");
		} catch (error) {
			// Still clear input even if addUrl fails
			setUrlInput("");
			throw error;
		}
	};

	return (
		<AppInput
			errorMessage={urlError}
			icon={<Image alt="Globe" className="text-input-icon" height={16} src="/icons/globe.svg" width={16} />}
			id="url-input"
			label="URL"
			onChange={(e) => {
				setUrlInput(e.target.value);
				if (urlError) {
					setUrlError(null);
				}
			}}
			onKeyDown={handleAddUrl}
			placeholder="Paste a link and press Enter to add"
			testId="url-input"
			type="url"
			value={urlInput}
		/>
	);
}
