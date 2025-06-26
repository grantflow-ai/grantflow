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
} from "@/components/projects/icons";
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

export default function FilePreviewCard({ file, parentId }: { file: FileWithId; parentId?: string }) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const { removeFile } = useApplicationStore();

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
				<DropdownMenuContent align="start" className="w-40" data-testid="file-context-menu">
					<DropdownMenuItem
						className="gap-2"
						data-testid="file-menu-open"
						disabled={!canOpenInBrowser}
						onClick={handleOpen}
					>
						<ExternalLink className="size-4" />
						Open
					</DropdownMenuItem>
					<DropdownMenuItem
						className="text-destructive focus:text-destructive gap-2"
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
			<div className="mb-1">
				<FileIcon extension={extension} />
			</div>
			<span
				className="text-app-gray-700 max-w-fit truncate text-[10px] font-normal leading-3"
				data-testid="file-name"
				title={fileName}
			>
				{fileName}
			</span>
		</>
	);
}

function FileIcon({ extension }: { extension: string }) {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const iconComponent = FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP] ?? FILE_ICON_MAP.unknown;
	return <div className="flex items-center justify-center">{iconComponent}</div>;
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}