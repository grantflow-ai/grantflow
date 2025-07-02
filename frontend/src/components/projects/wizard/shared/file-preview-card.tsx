"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppDropdownMenu, AppDropdownMenuContent, AppDropdownMenuItem, AppDropdownMenuTrigger } from "@/components/app";
import { useApplicationStore } from "@/stores/application-store";

import type { FileWithId } from "@/types/files";

const FILE_ICON_MAP = {
	"": <Image alt="General file" height={56} src="/icons/file-general.svg" width={48} />,
	csv: <Image alt="CSV file" height={56} src="/icons/file-csv.svg" width={48} />,
	doc: <Image alt="DOC file" height={56} src="/icons/file-doc.svg" width={48} />,
	docx: <Image alt="DOCX file" height={56} src="/icons/file-docx.svg" width={48} />,
	markdown: <Image alt="Markdown file" height={56} src="/icons/file-markdown.svg" width={48} />,
	md: <Image alt="Markdown file" height={56} src="/icons/file-markdown.svg" width={48} />,
	pdf: <Image alt="PDF file" height={56} src="/icons/file-pdf.svg" width={48} />,
	ppt: <Image alt="PPT file" height={56} src="/icons/file-ppt.svg" width={48} />,
	pptx: <Image alt="PPTX file" height={56} src="/icons/file-pptx.svg" width={48} />,
	unknown: <Image alt="Unknown file" height={56} src="/icons/file-general.svg" width={48} />,
} as const;

export function FilePreviewCard({ file, parentId }: { file: FileWithId; parentId?: string }) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const removeFile = useApplicationStore((state) => state.removeFile);

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
		if (!parentId) return;
		await removeFile(file, parentId);
		setDropdownOpen(false);
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setDropdownOpen(true);
	};

	return (
		<div className="hover:bg-app-gray-100 group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-2 transition-all">
			{canOpenInBrowser ? (
				<button
					aria-label={`Open ${file.name}`}
					className="flex flex-col items-center justify-center focus:outline-none"
					onClick={handleOpen}
					onContextMenu={handleContextMenu}
					title="Click to open file"
					type="button"
				>
					<FileContent extension={extension} fileName={file.name} />
				</button>
			) : (
				<div
					aria-label={`File ${file.name} - right click for options`}
					onContextMenu={handleContextMenu}
					role="img"
				>
					<FileContent extension={extension} fileName={file.name} />
				</div>
			)}

			<AppDropdownMenu modal={false} onOpenChange={setDropdownOpen} open={dropdownOpen}>
				<AppDropdownMenuTrigger className="sr-only" disabled>
					<span>File options</span>
				</AppDropdownMenuTrigger>
				<AppDropdownMenuContent
					align="start"
					className="w-40 border-app-gray-100 bg-white p-1"
					data-testid="file-context-menu"
				>
					<AppDropdownMenuItem
						className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-app-gray-100"
						data-testid="file-menu-open"
						disabled={!canOpenInBrowser}
						onClick={handleOpen}
					>
						<ExternalLink className="size-4 text-app-gray-600" />
						Open
					</AppDropdownMenuItem>
					<AppDropdownMenuItem
						className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-red hover:bg-app-gray-100"
						data-testid="file-menu-remove"
						disabled={!parentId}
						onClick={handleRemove}
					>
						<Trash2 className="size-4" />
						Remove
					</AppDropdownMenuItem>
				</AppDropdownMenuContent>
			</AppDropdownMenu>
		</div>
	);
}

function FileContent({ extension, fileName }: { extension: string; fileName: string }) {
	return (
		<>
			<div className="flex h-14 w-12 items-center justify-center" data-testid="file-icon">
				{extension in FILE_ICON_MAP
					? FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP]
					: FILE_ICON_MAP.unknown}
			</div>
			<span
				className="mt-1 max-w-20 truncate text-center text-[10px] leading-[13px]"
				data-testid="file-name"
				title={fileName}
			>
				{fileName}
			</span>
		</>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}