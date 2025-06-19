import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	IconFileCsv,
	IconFileDoc,
	IconFileDocX,
	IconFileGeneral,
	IconFileMarkdown,
	IconFilePdf,
	IconFilePpt,
	IconFilePptx,
} from "@/components/workspaces/icons";

import type { FileWithId } from "@/types/files";
import type React from "react";

export default function FilePreviewCard({
	file,
	onRemove,
}: {
	file: FileWithId;
	onRemove?: (file: FileWithId) => Promise<void>;
}) {
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

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setDropdownOpen(true);
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

	const fileContent = (
		<>
			<div className="mb-1">
				<FileIcon />
			</div>
			<span className="text-app-gray-700 max-w-fit truncate text-[10px] font-normal leading-3" title={file.name}>
				{file.name}
			</span>
		</>
	);

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
					{fileContent}
				</button>
			) : (
				<div
					aria-label={`File ${file.name} - right click for options`}
					onContextMenu={handleContextMenu}
					role="img"
				>
					{fileContent}
				</div>
			)}

			<DropdownMenu modal={false} onOpenChange={setDropdownOpen} open={dropdownOpen}>
				<DropdownMenuTrigger className="sr-only" disabled>
					<span>File options</span>
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
