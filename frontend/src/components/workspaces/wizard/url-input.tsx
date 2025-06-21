"use client";

import React from "react";

import AppInput from "@/components/input-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { useApplicationStore } from "@/stores/application-store";
import { isValidUrl } from "@/utils/validation";

export function UrlInput({ onUrlAdded, parentId }: { onUrlAdded?: () => void; parentId?: string }) {
	const { addUrl, application } = useApplicationStore();

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

	const handleAddUrl = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && urlInput.trim()) {
			e.preventDefault();
			const trimmedUrl = urlInput.trim();

			if (!isValidUrl(trimmedUrl)) {
				setUrlError("Please enter a valid URL");
				return;
			}

			if (!parentId) {
				setUrlError("Cannot add URL: Parent ID missing");
				return;
			}

			setUrlError(null);

			if (!urls.includes(trimmedUrl)) {
				await addUrl(trimmedUrl, parentId);
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
			testId="url-input"
			type="url"
			value={urlInput}
		/>
	);
}
