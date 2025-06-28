import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	IconFileCsv,
	IconFileDoc,
	IconFileDocX,
	IconFileGeneral,
	IconFileMarkdown,
	IconFilePdf,
	IconFilePpt,
	IconFilePptx,
} from "@/components/projects/shared/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApplicationStore } from "@/stores/application-store";

import type { FileWithId } from "@/types/files";

const FILE_ICON_MAP = {
	"": <IconFileGeneral height={56} width={48} />,
	csv: <IconFileCsv height={56} width={48} />,
	doc: <IconFileDoc height={56} width={48} />,
	docx: <IconFileDocX height={56} width={48} />,
	markdown: <IconFileMarkdown height={56} width={48} />,
	md: <IconFileMarkdown height={56} width={48} />,
	pdf: <IconFilePdf height={56} width={48} />,
	ppt: <IconFilePpt height={56} width={48} />,
	pptx: <IconFilePptx height={56} width={48} />,
	unknown: <IconFileGeneral height={56} width={48} />,
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

			<DropdownMenu modal={false} onOpenChange={setDropdownOpen} open={dropdownOpen}>
				<DropdownMenuTrigger className="sr-only" disabled>
					<span>File options</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className="w-40 border-app-gray-100 bg-white p-1"
					data-testid="file-context-menu"
				>
					<DropdownMenuItem
						className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-app-gray-100"
						data-testid="file-menu-open"
						disabled={!canOpenInBrowser}
						onClick={handleOpen}
					>
						<ExternalLink className="size-4 text-app-gray-600" />
						Open
					</DropdownMenuItem>
					<DropdownMenuItem
						className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-red hover:bg-app-gray-100"
						data-testid="file-menu-remove"
						disabled={!parentId}
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

function FileContent({ extension, fileName }: { extension: string; fileName: string }) {
	return (
		<>
			<div className="flex h-14 w-12 items-center justify-center">
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
