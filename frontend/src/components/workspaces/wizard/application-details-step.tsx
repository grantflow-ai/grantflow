"use client";

import { Link } from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

import { crawlTemplateUrl, deleteTemplateSource } from "@/actions/sources";
import { AppTextarea } from "@/components/textarea-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logError } from "@/utils/logging";

import { ApplicationPreview, FileWithId } from "./application-preview";
import { TemplateFileContainer } from "./template-file-container";

const TITLE_MAX_LENGTH = 255;

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
		<div className="flex h-full gap-8" data-testid="application-details-step">
			<div className="w-[30%] space-y-8 overflow-auto px-6">
				<div className="space-y-6">
					<div>
						<h2 className="text-2xl font-semibold">Application Title</h2>
						<p className="text-muted-foreground text-sm">
							Give your application file a clear, descriptive name.
						</p>
					</div>

					<div className="space-y-2">
						<AppTextarea
							countType="chars"
							id="application-title"
							label="Title of your grant application"
							maxCount={TITLE_MAX_LENGTH}
							onChange={(e) => {
								onApplicationTitleChange(e.target.value);
							}}
							placeholder="Enter a descriptive title for your grant application"
							rows={3}
							showCount
							testId="application-title"
							value={applicationTitle}
						/>
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<h2 className="text-2xl font-semibold">Application Instructions</h2>
					</div>

					<div className="space-y-6 rounded-lg border p-6">
						<div className="space-y-4">
							<h3 className="text-base font-medium">Documents</h3>
							<p className="text-muted-foreground text-sm">
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

						<div className="border-t pt-6">
							<div className="space-y-4">
								<h3 className="text-base font-medium">Links</h3>
								<p className="text-muted-foreground text-sm">
									Paste links to any online guidelines or application portals. These will help us
									better understand the funding requirements.
								</p>

								<div className="space-y-2">
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
								</div>

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
