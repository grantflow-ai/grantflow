"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";

import { crawlTemplateUrl, deleteTemplateSource } from "@/actions/sources";
import AppInput from "@/components/input-field";
import AppTextArea from "@/components/textarea-field";
import { IconGlobe } from "@/components/workspaces/icons";
import { logError } from "@/utils/logging";

import { ApplicationPreview, FileWithId } from "./application-preview";
import { TemplateFileContainer } from "./template-file-container";

const TITLE_MAX_LENGTH = 120;

interface ApplicationDetailsStepProps {
	applicationTitle: string;
	connectionStatus?: string;
	connectionStatusColor?: string;
	fileCount: number;
	onApplicationTitleChange: (value: string) => void;
	onFileCountChange: (count: number) => void;
	onUrlsChange: (urls: string[]) => void;
	templateId: string;
	urls: string[];
	workspaceId: string;
}

export function ApplicationDetailsStep({
	applicationTitle,
	connectionStatus,
	connectionStatusColor,
	fileCount: _fileCount,
	onApplicationTitleChange,
	onFileCountChange,
	onUrlsChange,
	templateId,
	urls,
	workspaceId,
}: ApplicationDetailsStepProps) {
	const [urlInput, setUrlInput] = useState("");
	const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);

	const handleAddUrl = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && urlInput.trim()) {
			e.preventDefault();
			const trimmedUrl = urlInput.trim();

			if (!urls.includes(trimmedUrl)) {
				try {
					const result = await crawlTemplateUrl(workspaceId, templateId, trimmedUrl);
					toast.success(result.message || "URL added successfully");

					onUrlsChange([...urls, trimmedUrl]);
				} catch (error) {
					logError({ error, identifier: "crawlTemplateUrl" });
					toast.error("Failed to process URL. Please try again.");
				}
			}
			setUrlInput("");
		}
	};

	const handleRemoveUrl = (urlToRemove: string) => {
		onUrlsChange(urls.filter((url) => url !== urlToRemove));
	};

	const handleFileRemove = useCallback(
		async (file: FileWithId) => {
			if (!file.id) {
				toast.error("Cannot remove file: File ID not found");
				return;
			}

			try {
				await deleteTemplateSource(workspaceId, templateId, file.id);
				toast.success(`File ${file.name} removed`);
			} catch (error) {
				logError({ error, identifier: "deleteTemplateSource" });
				toast.error("Failed to remove file. Please try again.");
			}
		},
		[workspaceId, templateId],
	);

	return (
		<div className="flex size-full" data-testid="application-details-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2 className="font-heading text-2xl font-medium leading-loose">Application Title</h2>
						<p className="text-muted-foreground-dark leading-tight">
							Give your application file a clear, descriptive name.
						</p>
					</div>

					<AppTextArea
						countType="chars"
						id="application-title"
						label="Application Title"
						maxCount={TITLE_MAX_LENGTH}
						onChange={(e) => {
							onApplicationTitleChange(e.target.value);
						}}
						placeholder="Title of your grant application"
						rows={4}
						showCount
						testId="application-title"
						value={applicationTitle}
					/>
				</div>

				<div className="space-y-6">
					<h2 className="font-heading text-2xl font-medium leading-loose">Application Instructions</h2>

					<div>
						<h3 className="font-heading mb-1 text-base font-semibold leading-snug">Documents</h3>
						<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
							Upload the official Call for Proposals or any relevant documents (PDF, Doc). We&apos;ll
							analyze these to extract key requirements for your application.
						</p>
						<TemplateFileContainer
							onFileCountChange={onFileCountChange}
							onFilesChange={setUploadedFiles}
							templateId={templateId}
							workspaceId={workspaceId}
						/>
					</div>

					<div>
						<h3 className="font-heading text-base font-semibold leading-snug">Links</h3>
						<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
							Paste links to any online guidelines or application portals. These will help us better
							understand the funding requirements.
						</p>

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
						{/* <div className="space-y-2">
							<Label htmlFor="url-input">URL</Label>
							<div className="relative">
								<Input
									id="url-input"
									onChange={(e) => {
										setUrlInput(e.target.value);
									}}
									onKeyDown={handleAddUrl}
									placeholder="Paste a link and press Enter to add"
									type="url"
									value={urlInput}
								/>
								<Link className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
							</div>
						</div> */}

						{urls.length > 0 && (
							<div className="space-y-2">
								{urls.map((url, index) => (
									<div
										className="flex items-center justify-between rounded-md border p-2 text-sm"
										key={index}
									>
										<span className="truncate">{url}</span>
										<button
											className="text-muted-foreground hover:text-foreground ml-2"
											onClick={() => {
												handleRemoveUrl(url);
											}}
											type="button"
										>
											×
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			<ApplicationPreview
				applicationTitle={applicationTitle}
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				files={uploadedFiles}
				onFileRemove={handleFileRemove}
				urls={urls}
			/>
		</div>
	);
}
