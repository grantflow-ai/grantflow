"use client";

import { FILE_ICON_MAP } from "@/components/shared/file-icon-map";
import type { FileWithId } from "@/types/files";
import { getFileExtension } from "@/utils/file-extensions";

export function PendingFilePreviewCard({ file }: { file: FileWithId }) {
	const extension = getFileExtension(file.name);

	return (
		<div
			className="group relative flex cursor-pointer flex-col items-center justify-center rounded bg-white p-1 transition-all w-14 animate-pulse"
			data-testid="pending-file-preview-card"
			title={`Uploading ${file.name}...`}
		>
			<div className="w-full">
				<PendingFileContent extension={extension} fileName={file.name} />
			</div>
		</div>
	);
}

function PendingFileContent({ extension, fileName }: { extension: string; fileName: string }) {
	return (
		<div className="flex flex-col items-center justify-center w-full">
			<div className="flex items-center justify-center animate-pulse" data-testid="pending-file-icon">
				{FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP]}
			</div>
			<span
				className="w-full max-w-full truncate text-center text-app-gray-700 text-[10px] leading-3 opacity-70"
				data-testid="pending-file-name"
				title={fileName}
			>
				{fileName}
			</span>
		</div>
	);
}
