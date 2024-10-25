import { type ChangeEvent, useCallback } from "react";
import { toast } from "sonner";
import { formatBytes } from "@/utils/format";
import { FileTextIcon, X, Paperclip } from "lucide-react";
import type { FileData } from "@/types";
import { Button } from "gen/ui/button";
import Image from "next/image";

export function FileUploader({
	accept,
	maxSize,
	maxFileCount,
	currentFileCount,
	onFilesAdded,
}: {
	accept: string[];
	maxSize: number;
	maxFileCount: number;
	currentFileCount: number;
	onFilesAdded: (files: File[]) => void;
}) {
	const isDisabled = currentFileCount >= maxFileCount;

	const validateFileUploads = useCallback(
		(newFileUploads: File[]) => {
			const totalFiles = currentFileCount + newFileUploads.length;
			if (totalFiles > maxFileCount) {
				toast.error(`Upload is limited to ${maxFileCount} file(s)`);
				return false;
			}

			for (const file of newFileUploads) {
				if (file.size > maxSize) {
					toast.error(`File ${file.name} is too large. The max size per file is ${formatBytes(maxSize)}`);
					return false;
				}
			}

			return true;
		},
		[currentFileCount, maxFileCount, maxSize],
	);

	const handleFileChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			if (!event.target.files) {
				return;
			}

			const newFiles = [...event.target.files];

			if (validateFileUploads(newFiles)) {
				onFilesAdded(newFiles);
			}

			event.target.value = "";
		},
		[onFilesAdded, validateFileUploads],
	);

	return (
		<div className="relative">
			<input
				type="file"
				id="file-upload"
				data-testid="file-input"
				accept={accept.join(", ")}
				disabled={isDisabled}
				onChange={handleFileChange}
				multiple={true}
				className="sr-only"
			/>
			<label
				htmlFor="file-upload"
				className="inline-flex items-center justify-center border border-input rounded p-2 bg-background hover:bg-accent hover:text-accent-foreground"
			>
				<Paperclip className="mr-2 h-4 w-4" />
				<span className="text-sm">Upload Files</span>
			</label>
		</div>
	);
}

export function FileCard({ file, onRemove }: { file: FileData; onRemove: () => void }) {
	return (
		<div
			className="relative flex items-center gap-4 rounded-lg border p-4 shadow-sm"
			data-testid={`file-card-${file.name}`}
		>
			<FilePreview file={file} />
			<div className="flex flex-1 flex-col gap-1">
				<p
					className="text-sm font-medium text-gray-700 truncate"
					data-testid={`file-name-display-${file.name}`}
				>
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

export function FilePreview({ file }: { file: FileData }) {
	if (file.previewUrl) {
		return (
			<Image
				src={file.previewUrl}
				alt={file.name}
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
