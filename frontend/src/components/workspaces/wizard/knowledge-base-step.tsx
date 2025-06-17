"use client";

import { ExternalLink, Link, Trash2 } from "lucide-react";
import React, { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { deleteApplicationSource } from "@/actions/sources";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	IconClose,
	IconFileCsv,
	IconFileDoc,
	IconFileDocX,
	IconFileGeneral,
	IconFileMarkdown,
	IconFilePdf,
	IconFilePpt,
	IconFilePptx,
	IconPreviewLogo,
} from "@/components/workspaces/icons";
import { useWizardStore } from "@/stores/wizard-store";
import { useDebounce } from "@/utils/debounce";
import { logError } from "@/utils/logging";

import { FileWithId } from "./application-preview";
import { TemplateFileUploader } from "./template-file-uploader";
import { UrlInput } from "./url-input";

const DEBOUNCE_MS = 1000;
const POLLING_INTERVAL_DURATION = 3000;

export function KnowledgeBaseStep() {
	const {
		addKnowledgeBaseFile,
		addKnowledgeBaseUrl,
		applicationState: { applicationId },
		areKnowledgeBaseFilesOrUrlsIndexing,
		contentState: { knowledgeBaseUrls },
		polling: { start, stop },
		removeKnowledgeBaseFile,
		removeKnowledgeBaseUrl,
		retrieveApplication,
		workspaceId,
	} = useWizardStore();

	const getIndexingStatus = useCallback(async () => {
		await retrieveApplication();
		return areKnowledgeBaseFilesOrUrlsIndexing();
	}, [retrieveApplication, areKnowledgeBaseFilesOrUrlsIndexing]);

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

	const handleRemoveUrl = (urlToRemove: string) => {
		removeKnowledgeBaseUrl(urlToRemove);
	};

	const handleFileRemove = useCallback(
		async (fileToRemove: FileWithId) => {
			if (!fileToRemove.id) {
				toast.error("Cannot remove file: File ID not found");
				return;
			}

			try {
				await deleteApplicationSource(workspaceId, applicationId ?? "", fileToRemove.id);
				removeKnowledgeBaseFile(fileToRemove);
				toast.success(`File ${fileToRemove.name} removed`);
			} catch (error) {
				logError({ error, identifier: "deleteApplicationSource" });
				toast.error("Failed to remove file. Please try again.");
			}
		},
		[workspaceId, applicationId, removeKnowledgeBaseFile],
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
							<h3 className="font-heading mb-5 text-base font-semibold leading-snug">Documents</h3>
							<TemplateFileUploader
								addFileAction={addKnowledgeBaseFile}
								onUploadComplete={handleDocumentChange}
								uploadType="application"
							/>
						</div>

						<div>
							<h3 className="font-heading text-base font-semibold leading-snug">Links</h3>
							<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
								Use a static link that doesn&apos;t require login, so we can retrieve the information.
							</p>

							<UrlInput
								addUrlAction={addKnowledgeBaseUrl}
								crawlType="application"
								existingUrls={knowledgeBaseUrls}
								onUrlAdded={handleDocumentChange}
							/>
						</div>
					</div>
				</div>
			</div>

			<KnowledgeBasePreview onFileRemove={handleFileRemove} onUrlRemove={handleRemoveUrl} />
		</div>
	);
}

function FilePreviewCard({ file, onRemove }: { file: FileWithId; onRemove?: (file: FileWithId) => Promise<void> }) {
	const {
		setFileDropdownOpen,
		ui: { fileDropdownStates },
	} = useWizardStore();
	const dropdownOpen = fileDropdownStates[file.name] ?? false;

	const extension = getFileExtension(file.name) ?? "";

	const canOpenInBrowser = ["gif", "jpeg", "jpg", "pdf", "png", "svg", "webp"].includes(extension);

	const handleOpen = () => {
		if (canOpenInBrowser && file instanceof File) {
			const url = URL.createObjectURL(file);
			window.open(url, "_blank");
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 1000);
		}
	};

	const handleRemove = async () => {
		if (onRemove) {
			await onRemove(file);
			setFileDropdownOpen(file.name, false);
		}
	};

	const FileIcon = () => {
		const getIconComponent = () => {
			switch (extension) {
				case "csv": {
					return <IconFileCsv height={56} width={48} />;
				}
				case "doc": {
					return <IconFileDoc height={56} width={48} />;
				}
				case "docx": {
					return <IconFileDocX height={56} width={48} />;
				}
				case "markdown":
				case "md": {
					return <IconFileMarkdown height={56} width={48} />;
				}
				case "pdf": {
					return <IconFilePdf height={56} width={48} />;
				}
				case "ppt": {
					return <IconFilePpt height={56} width={48} />;
				}
				case "pptx": {
					return <IconFilePptx height={56} width={48} />;
				}
				default: {
					return <IconFileGeneral height={56} width={48} />;
				}
			}
		};

		return <div className="flex items-center justify-center">{getIconComponent()}</div>;
	};

	return (
		<div
			className="hover:bg-app-gray-100 group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-2 transition-all"
			onContextMenu={(e) => {
				e.preventDefault();
				setFileDropdownOpen(file.name, true);
			}}
			onDoubleClick={canOpenInBrowser ? handleOpen : undefined}
			title={canOpenInBrowser ? "Double-click to open file" : undefined}
		>
			<div className="mb-1">
				<FileIcon />
			</div>
			<span className="text-app-gray-700 max-w-fit truncate text-[10px] font-normal leading-3" title={file.name}>
				{file.name}
			</span>

			<DropdownMenu
				modal={false}
				onOpenChange={(open) => {
					setFileDropdownOpen(file.name, open);
				}}
				open={dropdownOpen}
			>
				<DropdownMenuTrigger disabled>
					<span className="sr-only">Open menu</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-40">
					<DropdownMenuItem className="gap-2" disabled={!canOpenInBrowser} onClick={handleOpen}>
						<ExternalLink className="size-4" />
						Open
					</DropdownMenuItem>
					<DropdownMenuItem
						className="text-destructive focus:text-destructive gap-2"
						disabled={!onRemove}
						onClick={handleRemove}
					>
						<Trash2 className="size-4" />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}

function KnowledgeBasePreview({
	onFileRemove,
	onUrlRemove,
}: {
	onFileRemove: (file: FileWithId) => Promise<void>;
	onUrlRemove: (url: string) => void;
}) {
	const { applicationState, contentState } = useWizardStore();
	const { applicationTitle } = applicationState;
	const { knowledgeBaseFiles, knowledgeBaseUrls } = contentState;
	const hasContent = applicationTitle || knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			{hasContent ? (
				<>
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
				</>
			) : (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
				</div>
			)}
		</div>
	);
}

function LinkPreviewItem({ onRemove, url }: { onRemove?: (url: string) => void; url: string }) {
	const {
		setLinkHoverState,
		ui: { linkHoverStates },
	} = useWizardStore();
	const isHovered = linkHoverStates[url] ?? false;

	const handleRemove = () => {
		onRemove?.(url);
	};

	return (
		<div
			className="group relative flex items-center gap-2"
			data-testid="link-preview-item"
			onMouseEnter={() => {
				setLinkHoverState(url, true);
			}}
			onMouseLeave={() => {
				setLinkHoverState(url, false);
			}}
		>
			<div className="flex size-3.5 shrink-0 items-center justify-center">
				{isHovered ? (
					<IconClose
						className="cursor-pointer text-blue-600"
						data-testid="link-remove-icon"
						onClick={handleRemove}
					/>
				) : (
					<Link className="text-primary" />
				)}
			</div>
			<Button asChild className="h-auto justify-start p-0.5 text-blue-600 hover:text-blue-800" variant="link">
				<a data-testid="link-url" href={url} rel="noopener noreferrer" target="_blank">
					{url}
				</a>
			</Button>
		</div>
	);
}
