"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { deleteApplicationSource } from "@/actions/sources";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { IconPreviewLogo } from "@/components/workspaces/icons";
import FilePreviewCard from "@/components/workspaces/wizard/file-preview-card";
import LinkPreviewItem from "@/components/workspaces/wizard/link-preview-item";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { useDebounce } from "@/utils/debounce";
import { logError } from "@/utils/logging";

import { TemplateFileUploader } from "./template-file-uploader";
import { UrlInput } from "./url-input";

import type { FileWithId } from "@/types/files";

const DEBOUNCE_MS = 1000;
const POLLING_INTERVAL_DURATION = 3000;

export function KnowledgeBaseStep() {
	const { polling } = useWizardStore();
	const { start, stop } = polling;
	const { application, areFilesOrUrlsIndexing, removeFile, removeUrl, retrieveApplication } = useApplicationStore();

	const applicationId = application?.id;
	const workspaceId = application?.workspace_id;

	const getIndexingStatus = useCallback(async () => {
		if (workspaceId && applicationId) {
			await retrieveApplication(workspaceId, applicationId);
		}
		return areFilesOrUrlsIndexing();
	}, [retrieveApplication, areFilesOrUrlsIndexing, workspaceId, applicationId]);

	const handleRetrieveWithPolling = useCallback(async () => {
		const isIndexing = await getIndexingStatus();

		if (isIndexing) {
			start(handleRetrieveWithPolling, POLLING_INTERVAL_DURATION, false);
		} else {
			stop();
		}
	}, [getIndexingStatus, start, stop]);

	const debouncedRetrieveApplication = useDebounce(handleRetrieveWithPolling, DEBOUNCE_MS);

	const handleDocumentChange = useCallback(() => {
		debouncedRetrieveApplication();
	}, [debouncedRetrieveApplication]);

	useEffect(() => {
		return () => {
			stop();
		};
	}, [stop]);

	const handleRemoveUrl = async (urlToRemove: string) => {
		await removeUrl(urlToRemove);
	};

	const handleFileRemove = useCallback(
		async (fileToRemove: FileWithId) => {
			if (!fileToRemove.id) {
				toast.error("Cannot remove file: File ID not found");
				return;
			}

			if (!application?.workspace_id) {
				toast.error("Cannot remove file: Workspace ID missing from the application");
				return;
			}

			try {
				await deleteApplicationSource(application.workspace_id, applicationId ?? "", fileToRemove.id);
				await removeFile(fileToRemove);
				toast.success(`File ${fileToRemove.name} removed`);
			} catch (error) {
				logError({ error, identifier: "deleteApplicationSource" });
				toast.error("Failed to remove file. Please try again.");
			}
		},
		[applicationId, removeFile, application?.workspace_id],
	);

	return (
		<div className="flex size-full" data-testid="knowledge-base-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="knowledge-base-header"
						>
							Knowledge Base
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="knowledge-base-description"
						>
							Upload your supporting materials, research, notes, slides, publications, bios, references,
							so we have full context. The more you share, the stronger your application.
						</p>
					</div>

					<div className="space-y-6">
						<div>
							<h3
								className="font-heading mb-5 text-base font-semibold leading-snug"
								data-testid="documents-title"
							>
								Documents
							</h3>
							<TemplateFileUploader onUploadComplete={handleDocumentChange} />
						</div>

						<div>
							<h3 className="font-heading text-base font-semibold leading-snug" data-testid="links-title">
								Links
							</h3>
							<p
								className="text-muted-foreground-dark mb-5 text-sm leading-none"
								data-testid="links-subtitle"
							>
								Use a static link that doesn&apos;t require login, so we can retrieve the information.
							</p>

							<UrlInput onUrlAdded={handleDocumentChange} />
						</div>
					</div>
				</div>
			</div>

			<KnowledgeBasePreview onFileRemove={handleFileRemove} onUrlRemove={handleRemoveUrl} />
		</div>
	);
}

function KnowledgeBasePreview({
	onFileRemove,
	onUrlRemove,
}: {
	onFileRemove: (file: FileWithId) => Promise<void>;
	onUrlRemove: (url: string) => void;
}) {
	const { applicationTitle, uploadedFiles, urls } = useApplicationStore();
	const knowledgeBaseFiles = uploadedFiles;
	const knowledgeBaseUrls = urls;
	const hasContent = applicationTitle || knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			{hasContent ? (
				<ScrollArea className="flex-1">
					{(knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0) && (
						<Card
							className="border-app-gray-100 border bg-white p-5 shadow-none"
							data-testid="knowledge-base-container"
						>
							{knowledgeBaseFiles.length > 0 && (
								<div data-testid="knowledge-base-files">
									<h4 className="font-heading mb-8 font-semibold">Documents</h4>
									<div className="grid grid-cols-5 gap-3" data-testid="file-collection">
										{knowledgeBaseFiles.map((file, index) => (
											<FilePreviewCard
												file={file}
												key={file.name + index.toString()}
												onRemove={onFileRemove}
											/>
										))}
									</div>
								</div>
							)}

							{knowledgeBaseFiles.length > 0 && knowledgeBaseUrls.length > 0 && (
								<Separator className="my-8 bg-gray-200" data-testid="knowledge-base-separator" />
							)}

							{knowledgeBaseUrls.length > 0 && (
								<div data-testid="knowledge-base-urls">
									<h4 className="font-heading mb-8 font-semibold">Links</h4>
									<div className="space-y-1">
										{knowledgeBaseUrls.map((url, index) => (
											<LinkPreviewItem
												key={url + index.toString()}
												onRemove={onUrlRemove}
												url={url}
											/>
										))}
									</div>
								</div>
							)}
						</Card>
					)}
				</ScrollArea>
			) : (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
				</div>
			)}
		</div>
	);
}
