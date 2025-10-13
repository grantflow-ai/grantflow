"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from "@/components/app/app-dropdown";
import { FILE_ICON_MAP } from "@/components/shared/file-icon-map";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { getFileExtension } from "@/utils/file-extensions";
import { log } from "@/utils/logger/client";

export function FilePreviewCard({
	disableRemove = false,
	file,
	onDelete,
	parentId,
	sourceStatus,
}: {
	disableRemove?: boolean;
	file: FileWithId;
	onDelete?: () => Promise<void> | void;
	parentId?: string;
	sourceStatus?: string;
}) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const removeFile = useApplicationStore((state) => state.removeFile);

	const extension = getFileExtension(file.name);

	const canOpenInBrowser = ["md", "pdf"].includes(extension);
	const hasAccessibleContent = file instanceof File && file.size > 0;
	const canActuallyOpen = canOpenInBrowser && hasAccessibleContent;

	const isIndexing = sourceStatus === SourceIndexingStatus.INDEXING;
	const canRemove = !(isIndexing || disableRemove);

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
		if (!canRemove) return;

		if (onDelete) {
			await onDelete();
		} else if (parentId) {
			await removeFile(file, parentId);
		}
		setDropdownOpen(false);
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		setDropdownOpen(true);
	};

	return (
		<div
			className="hover:bg-app-gray-100 group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-1 transition-all w-14"
			data-testid="file-preview-card"
		>
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
						className="group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-app-gray-100"
						data-testid="file-menu-open"
						disabled={!canActuallyOpen}
						onClick={handleOpen}
					>
						<ExternalLink className="size-4 text-app-black group-hover:text-white" />
						Open
					</AppDropdownMenuItem>
					{!disableRemove && (
						<AppDropdownMenuItem
							className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
								canRemove
									? "cursor-pointer text-app-red hover:bg-app-gray-100"
									: "cursor-not-allowed text-app-gray-400"
							}`}
							data-testid="file-menu-remove"
							disabled={!(parentId && canRemove)}
							onClick={handleRemove}
							title={isIndexing ? "Cannot remove file while indexing is in progress" : "Remove file"}
						>
							<Trash2
								className={`size-4 ${canRemove ? "text-app-black group-hover:text-white" : "text-app-gray-400"}`}
							/>
							{isIndexing ? "Remove (indexing...)" : "Remove"}
						</AppDropdownMenuItem>
					)}
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
