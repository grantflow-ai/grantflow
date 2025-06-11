"use client";

import { ExternalLink, FileText, Link, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconClose, IconPreviewLogo } from "@/components/workspaces/icons";

export interface FileWithId extends File {
	id?: string;
}

interface ApplicationPreviewProps {
	applicationTitle: string;
	connectionStatus?: string;
	connectionStatusColor?: string;
	files: FileWithId[];
	onFileRemove?: (file: FileWithId) => Promise<void>;
	onUrlRemove?: (url: string) => void;
	urls: string[];
}

export function ApplicationPreview({
	applicationTitle,
	connectionStatus,
	connectionStatusColor,
	files,
	onFileRemove,
	onUrlRemove,
	urls,
}: ApplicationPreviewProps) {
	const isEmpty = !applicationTitle && files.length === 0 && urls.length === 0;

	return (
		<div className="flex h-full w-[70%] flex-col gap-6 border-l p-6">
			{isEmpty ? (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
					<p className="text-muted-foreground-dark mt-6 text-center text-sm">
						Add application details, documents, or links to see a preview
					</p>
				</div>
			) : (
				<>
					<div className="flex flex-col items-start gap-2">
						<div className="flex items-center gap-2">
							<Badge className="w-fit" variant="secondary">
								<FileText className="mr-1 size-3" />
								Application Title
							</Badge>
							{connectionStatus && (
								<Badge className={`w-fit ${connectionStatusColor} text-white`} variant="outline">
									{connectionStatus}
								</Badge>
							)}
						</div>
						<h3
							className={`font-heading text-center text-3xl font-medium ${applicationTitle ? "" : "text-muted-foreground-dark"}`}
						>
							{applicationTitle || "Untitled Application"}
						</h3>
					</div>

					<ScrollArea className="flex-1">
						<div className="space-y-4">
							{files.length > 0 && (
								<Card className="p-5" data-testid="application-documents">
									<h4 className="font-heading mb-4 font-semibold">Application Documents</h4>
									<div className="grid grid-cols-2 gap-3">
										{files.map((file, index) => (
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
								<Card className="p-5" data-testid="application-links">
									<h4 className="font-heading mb-4 font-semibold">Links</h4>
									<div className="space-y-2">
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
	const [dropdownOpen, setDropdownOpen] = useState(false);

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
		const iconClass = "h-16 w-12 relative";

		const getColor = () => {
			if (extension === "pdf") {
				return "fill-red-500";
			}
			if (["doc", "docx"].includes(extension)) {
				return "fill-blue-500";
			}
			if (["xls", "xlsx"].includes(extension)) {
				return "fill-green-500";
			}
			if (["ppt", "pptx"].includes(extension)) {
				return "fill-orange-500";
			}
			return "fill-gray-400";
		};

		return (
			<div className="relative">
				<svg className={iconClass} fill="none" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
					<path
						className={getColor()}
						d="M8 0h24l8 8v48a8 8 0 01-8 8H8a8 8 0 01-8-8V8a8 8 0 018-8z"
						opacity="0.2"
					/>
					<path
						className={getColor().replace("fill-", "text-")}
						d="M32 0v8h8M8 2h22v6h6v46a6 6 0 01-6 6H8a6 6 0 01-6-6V8a6 6 0 016-6z"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</svg>
				<div className={`absolute inset-x-0 bottom-3 flex items-center justify-center`}>
					<span className={`text-xs font-bold uppercase ${getColor().replace("fill-", "text-")}`}>
						{extension}
					</span>
				</div>
			</div>
		);
	};

	return (
		<div
			className="group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border bg-white p-3 transition-all hover:shadow-sm"
			onContextMenu={(e) => {
				e.preventDefault();
				setDropdownOpen(true);
			}}
			onDoubleClick={canOpenInBrowser ? handleOpen : undefined}
			title={canOpenInBrowser ? "Double-click to open file" : undefined}
		>
			<div className="mb-2">
				<FileIcon />
			</div>
			<span className="max-w-full truncate text-xs font-medium" title={file.name}>
				{file.name}
			</span>
			<span className="text-muted-foreground-dark text-[10px]">{(file.size / 1024 / 1024).toFixed(1)} MB</span>

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
		</div>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}

function LinkPreviewItem({ onRemove, url }: { onRemove?: (url: string) => void; url: string }) {
	const [isHovered, setIsHovered] = useState(false);

	const handleRemove = () => {
		onRemove?.(url);
	};

	return (
		<div
			className="group relative flex items-center gap-2"
			onMouseEnter={() => {
				setIsHovered(true);
			}}
			onMouseLeave={() => {
				setIsHovered(false);
			}}
		>
			<div className="flex size-3.5 shrink-0 items-center justify-center">
				{isHovered ? (
					<IconClose className="cursor-pointer text-blue-600" onClick={handleRemove} />
				) : (
					<Link className="text-blue-600" />
				)}
			</div>
			<Button asChild className="h-auto justify-start p-0.5 text-blue-600 hover:text-blue-800" variant="link">
				<a href={url} rel="noopener noreferrer" target="_blank">
					{url}
				</a>
			</Button>
		</div>
	);
}
