"use client";

import React, { useCallback } from "react";
import { toast } from "sonner";

import AppTextArea from "@/components/textarea-field";
import { logError } from "@/utils/logging";

import { ApplicationPreview, FileWithId } from "./application-preview";
import { TemplateFileUploader } from "./template-file-uploader";
import { UrlInput } from "./url-input";

const TITLE_MAX_LENGTH = 120;

interface ApplicationDetailsStepProps {
	applicationTitle: string;
	connectionStatus?: string;
	connectionStatusColor?: string;
	onApplicationTitleChange: (value: string) => void;
	onUploadedFilesChange: (files: FileWithId[]) => void;
	onUrlsChange: (urls: string[]) => void;
	templateId: string;
	uploadedFiles: FileWithId[];
	urls: string[];
	workspaceId: string;
}

export function ApplicationDetailsStep({
	applicationTitle,
	connectionStatus,
	connectionStatusColor,
	onApplicationTitleChange,
	onUploadedFilesChange,
	onUrlsChange,
	templateId,
	uploadedFiles,
	urls,
	workspaceId,
}: ApplicationDetailsStepProps) {
	const handleRemoveUrl = (urlToRemove: string) => {
		onUrlsChange(urls.filter((url) => url !== urlToRemove));
	};

	const handleFileRemove = useCallback(
		async (fileToRemove: FileWithId) => {
			if (!fileToRemove.id) {
				toast.error("Cannot remove file: File ID not found");
				return;
			}

			try {
				// TODO: await deleteTemplateSource(workspaceId, templateId, file.id);
				await new Promise(() => {
					/* */
				});
				onUploadedFilesChange(uploadedFiles.filter((f) => f.name !== fileToRemove.name));
				toast.success(`File ${fileToRemove.name} removed`);
			} catch (error) {
				logError({ error, identifier: "deleteTemplateSource" });
				toast.error("Failed to remove file. Please try again.");
			}
		},
		// TODO: [workspaceId, templateId],
		[uploadedFiles, onUploadedFilesChange],
	);

	return (
		<div className="flex size-full" data-testid="application-details-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="application-title-header"
						>
							Application Title
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="application-title-description"
						>
							Give your application file a clear, descriptive name.
						</p>
					</div>

					<AppTextArea
						countType="chars"
						id="application-title-textarea"
						label="Application Title"
						maxCount={TITLE_MAX_LENGTH}
						onChange={(e) => {
							onApplicationTitleChange(e.target.value);
						}}
						placeholder="Title of your grant application"
						rows={4}
						showCount
						testId="application-title-textarea"
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
						<TemplateFileUploader
							onFilesChange={(newFile) => {
								onUploadedFilesChange([...uploadedFiles, newFile]);
							}}
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

						<UrlInput
							onUrlsChange={onUrlsChange}
							templateId={templateId}
							urls={urls}
							workspaceId={workspaceId}
						/>
					</div>
				</div>
			</div>

			<ApplicationPreview
				applicationTitle={applicationTitle}
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				files={uploadedFiles}
				onFileRemove={handleFileRemove}
				onUrlRemove={handleRemoveUrl}
				urls={urls}
			/>
		</div>
	);
}
