import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { formatBytes } from "@/utils/format";
import { Paperclip, Upload } from "lucide-react";

const DEFAULT_FILE_ACCEPTS = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".doc", ".docx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xls", ".xlsx"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [".ppt", ".pptx"],
	"image/jpeg": [".jpeg", ".jpg"],
	"image/png": [".png"],
	"text/csv": [".csv"],
	"text/plain": [".txt"],
};

const DEFAULT_MAX_SIZE = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES = Infinity;

export function FileUploader({
	accept = DEFAULT_FILE_ACCEPTS,
	maxSize = DEFAULT_MAX_SIZE,
	maxFileCount = DEFAULT_MAX_FILES,
	currentFileCount = 0,
	onFilesAdded,
	fieldName,
	isDropZone = false,
}: {
	accept?: Record<string, string[]>;
	maxSize?: number;
	maxFileCount?: number;
	currentFileCount?: number;
	onFilesAdded: (files: File[]) => void;
	fieldName: string;
	isDropZone?: boolean;
}) {
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

	const handleFilesAdded = useCallback(
		(newFiles: File[]) => {
			if (validateFileUploads(newFiles)) {
				onFilesAdded(newFiles);
			}
		},
		[validateFileUploads, onFilesAdded],
	);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			handleFilesAdded(acceptedFiles);
		},
		[handleFilesAdded],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept,
		maxSize,
		disabled: currentFileCount >= maxFileCount,
	});

	if (isDropZone) {
		return (
			<div
				{...getRootProps()}
				className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
					isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary"
				}`}
			>
				<input {...getInputProps()} />
				<Upload className="mx-auto h-12 w-12 text-gray-400" />
				<p className="mt-2 text-sm text-gray-600">Drag &#39;n&#39; drop files here, or click to select files</p>
			</div>
		);
	}
	return (
		<div className="relative">
			<input
				type="file"
				id={`file-upload-${fieldName}`}
				data-testid="file-input"
				accept={Object.keys(accept).join(", ")}
				disabled={currentFileCount >= maxFileCount}
				onChange={(e) => {
					if (e.target.files) {
						handleFilesAdded([...e.target.files]);
					}
					e.target.value = "";
				}}
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
