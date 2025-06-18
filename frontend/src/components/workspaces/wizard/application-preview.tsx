"use client";

import { ExternalLink, Link, Trash2 } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	IconApplication,
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
import { ThemeBadge } from "@/components/workspaces/theme-badge";
import { useApplicationStore } from "@/stores/application-store";

export interface FileWithId extends File {
	id?: string;
}

interface ApplicationPreviewProps {
	connectionStatus?: string;
	connectionStatusColor?: string;
	onFileRemove?: (file: FileWithId) => Promise<void>;
	onUrlRemove?: (url: string) => void;
}

export function ApplicationPreview({
	connectionStatus,
	connectionStatusColor,
	onFileRemove,
	onUrlRemove,
}: ApplicationPreviewProps) {
	const { application, uploadedFiles, urls } = useApplicationStore();
	const isEmpty = !application?.title && uploadedFiles.length === 0 && urls.length === 0;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			{isEmpty ? (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
					<p className="text-muted-foreground-dark mt-6 text-center text-sm">
						Add application details, documents, or links to see a preview
					</p>
				</div>
			) : (
				<>
					<div className="mb-11 flex flex-col items-start gap-2">
						<div className="flex items-center gap-2">
							<ThemeBadge color="light" leftIcon={<IconApplication />}>
								Application Title
							</ThemeBadge>
							{connectionStatus && (
								<ThemeBadge className={`w-fit ${connectionStatusColor} text-white`}>
									{connectionStatus}
								</ThemeBadge>
							)}
						</div>
						<h3
							className={`font-heading text-center text-3xl font-medium ${application?.title ? "" : "text-muted-foreground-dark/50"}`}
							data-testid="application-title"
						>
							{application?.title ?? "Untitled Application"}
						</h3>
					</div>

					<ScrollArea className="flex-1">
						<div className="space-y-5">
							{uploadedFiles.length > 0 && (
								<Card
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-documents"
								>
									<h4 className="font-heading mb-8 font-semibold">Application Documents</h4>
									<div className="flex gap-3" data-testid="file-collection">
										{uploadedFiles.map((file, index) => (
											<FilePreviewCard
												file={file}
												key={file.name + index.toString()}
												onRemove={onFileRemove}
											/>
										))}
									</div>
								</Card>
							)}

							{urls.length > 0 && (
								<Card
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-links"
								>
									<h4 className="font-heading mb-8 font-semibold">Links</h4>
									<div className="space-y-1">
										{urls.map((url, index) => (
											<LinkPreviewItem
												key={url + index.toString()}
												onRemove={onUrlRemove}
												url={url}
											/>
										))}
									</div>
								</Card>
							)}
						</div>
					</ScrollArea>
				</>
			)}
		</div>
	);
}

function FilePreviewCard({ file, onRemove }: { file: FileWithId; onRemove?: (file: FileWithId) => Promise<void> }) {
	const [dropdownOpen, setDropdownOpen] = React.useState(false);

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
			setDropdownOpen(false);
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
		<button
			className="hover:bg-app-gray-100 group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-2 transition-all"
			onContextMenu={(e) => {
				e.preventDefault();
				setDropdownOpen(true);
			}}
			onDoubleClick={canOpenInBrowser ? handleOpen : undefined}
			onKeyDown={(e) => {
				if (e.key === "Enter" && canOpenInBrowser) {
					handleOpen();
				}
			}}
			title={canOpenInBrowser ? "Double-click to open file" : undefined}
			type="button"
		>
			<div className="mb-1">
				<FileIcon />
			</div>
			<span className="text-app-gray-700 max-w-fit truncate text-[10px] font-normal leading-3" title={file.name}>
				{file.name}
			</span>

			<DropdownMenu modal={false} onOpenChange={setDropdownOpen} open={dropdownOpen}>
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
		</button>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}

function LinkPreviewItem({ onRemove, url }: { onRemove?: (url: string) => void; url: string }) {
	const handleRemove = () => {
		onRemove?.(url);
	};

	return (
		<div className="group relative flex items-center gap-2" data-testid="link-preview-item">
			<div className="flex size-3.5 shrink-0 items-center justify-center">
				<IconClose
					className="cursor-pointer text-blue-600 opacity-0 transition-opacity group-hover:opacity-100"
					data-testid="link-remove-icon"
					onClick={handleRemove}
				/>
				<Link className="text-primary absolute opacity-100 transition-opacity group-hover:opacity-0" />
			</div>
			<Button asChild className="h-auto justify-start p-0.5 text-blue-600 hover:text-blue-800" variant="link">
				<a data-testid="link-url" href={url} rel="noopener noreferrer" target="_blank">
					{url}
				</a>
			</Button>
		</div>
	);
}
