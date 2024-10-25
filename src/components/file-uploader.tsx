import { type ChangeEvent, useCallback } from "react";
import { toast } from "sonner";
import { formatBytes } from "@/utils/format";
import { Paperclip } from "lucide-react";

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
