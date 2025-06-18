"use client";

import React from "react";
import { toast } from "sonner";

import { crawlTemplateUrl } from "@/actions/sources";
import AppInput from "@/components/input-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { useApplicationStore } from "@/stores/application-store";
import { logError } from "@/utils/logging";
import { isValidUrl } from "@/utils/validation";

export function UrlInput({ onUrlAdded }: { onUrlAdded?: () => void }) {
	const { addUrl, application, urls } = useApplicationStore();

	const [urlInput, setUrlInput] = React.useState("");
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
				if (!application?.grant_template?.id) {
					logError({ error: "Template not found", identifier: "handleAddUrl" });
					return;
				}

				try {
					const result = await crawlTemplateUrl(
						application.workspace_id,
						application.grant_template.id,
						trimmedUrl,
					);
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
