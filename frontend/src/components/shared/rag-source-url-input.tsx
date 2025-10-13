"use client";

import Image from "next/image";
import type React from "react";
import { useCallback, useState } from "react";
import AppInput from "@/components/app/fields/input-field";
import { isValidUrl } from "@/utils/validation";

interface RagSourceUrlInputProps {
	existingUrls?: string[];
	onUrlAdd: (url: string) => Promise<void>;
	testId?: string;
}

export function RagSourceUrlInput({ existingUrls = [], onUrlAdd, testId }: RagSourceUrlInputProps) {
	const [urlInput, setUrlInput] = useState("");
	const [urlError, setUrlError] = useState<null | string>(null);

	const validateUrl = useCallback(
		(url: string): null | string => {
			if (!isValidUrl(url)) {
				return "Please enter a valid URL";
			}
			if (existingUrls.includes(url)) {
				return "URL already exists";
			}
			return null;
		},
		[existingUrls],
	);

	const handleAddUrl = useCallback(
		async (e: React.KeyboardEvent<HTMLInputElement>) => {
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

			try {
				await onUrlAdd(trimmedUrl);
				setUrlInput("");
			} catch (error) {
				if (error instanceof Error) {
					setUrlError(error.message);
				}
			}
		},
		[onUrlAdd, urlInput, validateUrl],
	);

	return (
		<AppInput
			errorMessage={urlError}
			icon={<Image alt="Globe" className="text-input-icon" height={16} src="/icons/globe.svg" width={16} />}
			id={testId ? `${testId}-url-input` : "url-input"}
			label="URL"
			onChange={(e) => {
				setUrlInput(e.target.value);
				if (urlError) {
					setUrlError(null);
				}
			}}
			onKeyDown={handleAddUrl}
			placeholder="Paste a link and press Enter to add"
			testId={testId ?? "url-input"}
			type="url"
			value={urlInput}
		/>
	);
}
