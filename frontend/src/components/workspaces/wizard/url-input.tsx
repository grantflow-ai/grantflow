"use client";

import React from "react";

import AppInput from "@/components/input-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { useApplicationStore } from "@/stores/application-store";
import { isValidUrl } from "@/utils/validation";

export function UrlInput({ onUrlAdded }: { onUrlAdded?: () => void }) {
	const { addUrl, urls } = useApplicationStore();

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
				await addUrl(trimmedUrl);
				onUrlAdded?.();
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
