"use client";

import React from "react";
import { toast } from "sonner";

import { crawlTemplateUrl } from "@/actions/sources";
import AppInput from "@/components/input-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { useWizardStore } from "@/stores/wizard-store";
import { logError } from "@/utils/logging";

const isValidUrl = (url: string): boolean => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

export function UrlInput({ onUrlAdded }: { onUrlAdded?: () => void }) {
	const {
		addUrl,
		setUrlInput,
		templateId,
		ui: { urlInput },
		urls,
		workspaceId,
	} = useWizardStore();

	const [urlError, setUrlError] = React.useState<null | string>(null);

	const handleAddUrl = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && urlInput.trim()) {
			e.preventDefault();
			const trimmedUrl = urlInput.trim();

			if (!isValidUrl(trimmedUrl)) {
				setUrlError("Please enter a valid URL");
				return;
			}

			setUrlError(null);

			if (!urls.includes(trimmedUrl)) {
				try {
					const result = await crawlTemplateUrl(workspaceId, templateId ?? "", trimmedUrl);
					toast.success(result.message || "URL added successfully");

					addUrl(trimmedUrl);

					// Notify parent of URL addition
					onUrlAdded?.();
				} catch (error) {
					logError({ error, identifier: "crawlTemplateUrl" });
					toast.error("Failed to process URL. Please try again.");
				}
			}
			setUrlInput("");
		}
	};

	return (
		<AppInput
			errorMessage={urlError}
			icon={<IconGlobe />}
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
			type="url"
			value={urlInput}
		/>
	);
}
