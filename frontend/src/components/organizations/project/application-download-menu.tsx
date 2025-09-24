"use client";

import { Download, File, FileText, Loader2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DOWNLOAD_FORMATS } from "@/constants/download";
import type { DownloadFormat } from "@/types/download";

interface ApplicationDownloadMenuProps {
	disabled?: boolean;
	onDownload: (format: DownloadFormat) => void;
}

export function ApplicationDownloadMenu({ disabled = false, onDownload }: ApplicationDownloadMenuProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				className={`-mt-2 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
				disabled={disabled}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				{disabled ? (
					<Loader2 className="size-4 text-gray-400 animate-spin" />
				) : (
					<Download className="size-4 text-gray-700" />
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-1">
				{Object.entries(DOWNLOAD_FORMATS).map(([format, config]) => {
					const IconComponent = format === "markdown" ? FileText : File;
					return (
						<DropdownMenuItem
							className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
							key={format}
							onClick={(e) => {
								e.stopPropagation();
								onDownload(format as DownloadFormat);
							}}
						>
							<IconComponent className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
							{config.label}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
