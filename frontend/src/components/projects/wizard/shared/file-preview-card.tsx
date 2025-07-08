"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppDropdownMenu, AppDropdownMenuContent, AppDropdownMenuItem, AppDropdownMenuTrigger } from "@/components/app";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { log } from "@/utils/logger";

const FILE_ICON_MAP = {
	csv: <Image alt="CSV file" className="block" height={56} src="/icons/file-csv.svg" width={48} />,
	doc: <Image alt="DOC file" className="block" height={56} src="/icons/file-doc.svg" width={48} />,
	docx: <Image alt="DOCX file" className="block" height={56} src="/icons/file-docx.svg" width={48} />,
	latex: <Image alt="LaTeX file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
	markdown: <Image alt="Markdown file" className="block" height={56} src="/icons/file-markdown.svg" width={48} />,
	md: <Image alt="Markdown file" className="block" height={56} src="/icons/file-markdown.svg" width={48} />,
	odt: <Image alt="ODT file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
	pdf: <Image alt="PDF file" className="block" height={56} src="/icons/file-pdf.svg" width={48} />,
	ppt: <Image alt="PPT file" className="block" height={56} src="/icons/file-ppt.svg" width={48} />,
	pptx: <Image alt="PPTX file" className="block" height={56} src="/icons/file-pptx.svg" width={48} />,
	rst: <Image alt="RST file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
	rtf: <Image alt="RTF file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
	txt: <Image alt="TXT file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
	xlsx: <Image alt="XLSX file" className="block" height={56} src="/icons/file-general.svg" width={48} />,
} as const;

export function FilePreviewCard({
	file,
	parentId,
	sourceStatus,
}: {
	file: FileWithId;
	parentId?: string;
	sourceStatus?: string;
}) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const removeFile = useApplicationStore((state) => state.removeFile);

	const extension = getFileExtension(file.name) ?? "";

	const canOpenInBrowser = ["md", "pdf"].includes(extension);
	const hasAccessibleContent = file instanceof File && file.size > 0;
	const canActuallyOpen = canOpenInBrowser && hasAccessibleContent;

	const isIndexing = sourceStatus === SourceIndexingStatus.INDEXING;
	const canRemove = !isIndexing;

	const handleOpen = () => {
		if (!canActuallyOpen) return;

		try {
			const url = URL.createObjectURL(file);
			window.open(url, "_blank");
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 1000);
		} catch (error) {
			log.error("Failed to open file:", error);
		}
	};

	const handleRemove = async () => {
		if (!(parentId && canRemove)) return;
		await removeFile(file, parentId);
		setDropdownOpen(false);
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setDropdownOpen(true);
	};

	return (
		<div className="hover:bg-app-gray-100 group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-1 transition-all w-14">
			<div
				aria-label={`File ${file.name} - right click for options, double click to open`}
				className="w-full"
				onContextMenu={handleContextMenu}
				onDoubleClick={handleOpen}
				role="img"
			>
				<FileContent extension={extension} fileName={file.name} />
			</div>

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
						disabled={!canActuallyOpen}
						onClick={handleOpen}
					>
						<ExternalLink className="size-4 text-app-gray-600" />
						Open
					</AppDropdownMenuItem>
					<AppDropdownMenuItem
						className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
							canRemove
								? "cursor-pointer text-app-red hover:bg-app-gray-100"
								: "cursor-not-allowed text-app-gray-400"
						}`}
						data-testid="file-menu-remove"
						disabled={!(parentId && canRemove)}
						onClick={handleRemove}
						title={isIndexing ? "Cannot remove file while indexing is in progress" : "Remove file"}
					>
						<Trash2 className={`size-4 ${canRemove ? "" : "text-app-gray-400"}`} />
						{isIndexing ? "Remove (indexing...)" : "Remove"}
					</AppDropdownMenuItem>
				</AppDropdownMenuContent>
			</AppDropdownMenu>
		</div>
	);
}

function FileContent({ extension, fileName }: { extension: string; fileName: string }) {
	return (
		<div className="flex flex-col items-center justify-center w-full">
			<div className="flex items-center justify-center" data-testid="file-icon">
				{FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP]}
			</div>
			<span
				className="w-full max-w-full truncate text-center text-app-gray-700 text-[10px] leading-3"
				data-testid="file-name"
				title={fileName}
			>
				{fileName}
			</span>
		</div>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}
