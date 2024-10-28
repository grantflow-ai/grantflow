import { type ChangeEvent, useCallback } from "react";
import { toast } from "sonner";
import { formatBytes } from "@/utils/format";
import { Paperclip } from "lucide-react";

const DEFAULT_FILE_ACCEPTS = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"image/jpeg",
	"image/png",
	"text/csv",
	"text/plain",
];

const DEFAULT_MAX_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES = Infinity;

export function FileUploader({
	accept = DEFAULT_FILE_ACCEPTS,
	maxSize = DEFAULT_MAX_SIZE,
	maxFileCount = DEFAULT_MAX_FILES,
	currentFileCount,
	onFilesAdded,
	fieldName,
}: {
	accept?: string[];
	maxSize?: number;
	maxFileCount?: number;
	currentFileCount: number;
	onFilesAdded: (files: File[]) => void;
	fieldName: string;
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
				id={`file-upload-${fieldName}`}
				data-testid="file-input"
				accept={accept.join(", ")}
				disabled={isDisabled}
				onChange={handleFileChange}
				multiple={true}
				className="sr-only"
			/>
			<label
				htmlFor={`file-upload-${fieldName}`}
				className="inline-flex items-center justify-center border border-input rounded p-2 bg-background hover:bg-accent hover:text-accent-foreground"
			>
				<Paperclip className="mr-2 h-4 w-4" />
				<span className="text-sm">Upload Files</span>
			</label>
		</div>
	);
}
