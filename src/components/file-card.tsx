import Image from "next/image";
import { FileTextIcon, X } from "lucide-react";
import { formatBytes } from "@/utils/format";
import { Button } from "gen/ui/button";

export function FileCard({ file, onRemove }: { file: File; onRemove: () => void }) {
	return (
		<div
			className="relative flex items-center gap-4 rounded-lg border p-4 shadow-sm"
			data-testid={`file-card-${file.name}`}
		>
			<FilePreview file={file} />
			<div className="flex flex-1 flex-col gap-1">
				<p className="text-sm font-medium truncate" data-testid={`file-name-display-${file.name}`}>
					{file.name}
				</p>
				<p className="text-xs text-gray-500" data-testid="file-size">
					{formatBytes(file.size)}
				</p>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute top-1 right-1"
				onClick={onRemove}
				data-testid="remove-file-button"
			>
				<X className="h-4 w-4" />
				<span className="sr-only">Remove file</span>
			</Button>
		</div>
	);
}

export function FilePreview({ file }: { file: File }) {
	if (Reflect.has(file, "previewUrl")) {
		return (
			<Image
				src={Reflect.get(file, "previewUrl") as string}
				alt={file.name || "file thumbnail"}
				width={48}
				height={48}
				className="h-12 w-12 rounded-md object-cover"
				data-testid="file-preview-image"
			/>
		);
	}

	return (
		<div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100">
			<FileTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" data-testid="file-preview-icon" />
		</div>
	);
}
