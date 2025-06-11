"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import { crawlTemplateUrl } from "@/actions/sources";
import AppInput from "@/components/input-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { logError } from "@/utils/logging";

interface UrlInputProps {
	onUrlsChange: (urls: string[]) => void;
	templateId: string;
	urls: string[];
	workspaceId: string;
}

export function UrlInput({ onUrlsChange, templateId, urls, workspaceId }: UrlInputProps) {
	const [urlInput, setUrlInput] = useState("");

	const handleAddUrl = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && urlInput.trim()) {
			e.preventDefault();
			const trimmedUrl = urlInput.trim();

			if (!urls.includes(trimmedUrl)) {
				try {
					const result = await crawlTemplateUrl(workspaceId, templateId, trimmedUrl);
					toast.success([result.message || "URL added successfully"]);

					onUrlsChange([...urls, trimmedUrl]);
				} catch (error) {
					logError({ error, identifier: "crawlTemplateUrl" });
					toast.error(["Failed to process URL. Please try again."]);
				}
			}
			setUrlInput("");
		}
	};

	return (
		<AppInput
			icon={<IconGlobe />}
			id="url-input"
			label="URL"
			onChange={(e) => {
				setUrlInput(e.target.value);
			}}
			onKeyDown={handleAddUrl}
			placeholder="Paste a link and press Enter to add"
			type="url"
			value={urlInput}
		/>
	);
}
