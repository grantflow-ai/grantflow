"use client";

import { ExternalLink, Link, Trash2 } from "lucide-react";

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
import { useWizardStore } from "@/stores/wizard-store";

export interface FileWithId extends File {
	id?: string;
}

interface ApplicationPreviewProps {
	onFileRemove?: (file: FileWithId) => Promise<void>;
	onUrlRemove?: (url: string) => void;
}

export function ApplicationPreview({ onFileRemove, onUrlRemove }: ApplicationPreviewProps) {
	const {
		applicationState: { applicationTitle, wsConnectionStatus, wsConnectionStatusColor },
		contentState: { uploadedFiles, urls },
	} = useWizardStore();
	const isEmpty = !applicationTitle && uploadedFiles.length === 0 && urls.length === 0;

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
							{wsConnectionStatus && (
								<ThemeBadge className={`w-fit ${wsConnectionStatusColor} text-white`}>
									{wsConnectionStatus}
								</ThemeBadge>
							)}
						</div>
						<h3
							className={`font-heading text-center text-3xl font-medium ${applicationTitle ? "" : "text-muted-foreground-dark/50"}`}
							data-testid="application-title"
						>
							{applicationTitle || "Untitled Application"}
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
