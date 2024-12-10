import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { formatBytes } from "@/utils/format";
import { Paperclip, Upload } from "lucide-react";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";

const DEFAULT_FILE_ACCEPTS = {
	"application/csv": [".csv"],
	"application/latex": [".latex"],
	"application/pdf": [".pdf"],
	"application/rtf": [".rtf"],
	"application/vnd.oasis.opendocument.text": [".odt"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [".ppt", ".pptx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xls", ".xlsx"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".doc", ".docx"],
	"application/x-csv": [".csv"],
	"application/x-latex": [".latex"],
	"application/x-rtf": [".rtf"],
	"application/x-vnd.oasis.opendocument.text": [".odt"],
	"image/bmp": [".bmp"],
	"image/gif": [".gif"],
	"image/heif": [".heif"],
	"image/jpeg": [".jpeg", ".jpg"],
	"image/png": [".png"],
	"image/tiff": [".tiff"],
	"text/csv": [".csv"],
	"text/latex": [".latex"],
	"text/markdown": [".md"],
	"text/plain": [".txt"],
	"text/rst": [".rst"],
	"text/rtf": [".rtf"],
	"text/tab-separated-values": [".tsv"],
	"text/x-csv": [".csv"],
	"text/x-latex": [".latex"],
	"text/x-rst": [".rst"],
	"text/x-tsv": [".tsv"],
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
				className={cn(
					"p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors",
					isDragActive ? "border-primary bg-primary/10" : "border-input hover:border-primary",
					currentFileCount >= maxFileCount && "opacity-50 cursor-not-allowed",
				)}
			>
				<input {...getInputProps()} />
				<Upload className="mx-auto h-12 w-12 text-muted-foreground" />
				<p className="mt-2 text-sm text-muted-foreground">
					Drag &#39;n&#39; drop files here, or click to select files
				</p>
				{maxFileCount !== Infinity && (
					<p className="mt-2 text-xs text-muted-foreground">
						{currentFileCount} / {maxFileCount} files uploaded
					</p>
				)}
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
			<Button
				asChild
				variant="outline"
				size="sm"
				className={cn("text-sm", currentFileCount >= maxFileCount && "opacity-50 cursor-not-allowed")}
			>
				<label htmlFor={`file-upload-${fieldName}`}>
					<Paperclip className="mr-2 h-4 w-4" />
					Upload Files
				</label>
			</Button>
			{maxFileCount !== Infinity && (
				<p className="mt-2 text-xs text-muted-foreground">
					{currentFileCount} / {maxFileCount} files uploaded
				</p>
			)}
		</div>
	);
}
