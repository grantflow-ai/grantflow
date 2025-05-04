import { Button } from "@/components/ui/button";
import { Paperclip, Upload } from "lucide-react";
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/format";

const FILE_ACCEPTS = {
	"application/csv": [".csv"],
	"application/latex": [".latex"],
	"application/pdf": [".pdf"],
	"application/rtf": [".rtf"],
	"application/vnd.oasis.opendocument.text": [".odt"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
	"text/csv": [".csv"],
	"text/latex": [".latex"],
	"text/markdown": [".md"],
	"text/plain": [".txt"],
	"text/rst": [".rst"],
	"text/rtf": [".rtf"],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const DEFAULT_MAX_FILES = Infinity;

export function FileUploader({
	currentFileCount = 0,
	fieldName,
	isDropZone = false,
	maxFileCount = DEFAULT_MAX_FILES,
	onFilesAdded,
}: {
	currentFileCount?: number;
	fieldName: string;
	isDropZone?: boolean;
	maxFileCount?: number;
	onFilesAdded: (files: File[]) => void;
}) {
	const validateFileUploads = useCallback(
		(newFileUploads: File[]) => {
			const totalFiles = currentFileCount + newFileUploads.length;
			if (totalFiles > maxFileCount) {
				toast.error(`Upload is limited to ${maxFileCount} file(s)`);
				return false;
			}

			for (const file of newFileUploads) {
				if (file.size > MAX_FILE_SIZE) {
					toast.error(
						`File ${file.name} is too large. The max size per file is ${formatBytes(MAX_FILE_SIZE)}`,
					);
					return false;
				}
			}

			return true;
		},
		[currentFileCount, maxFileCount],
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

	const { getInputProps, getRootProps, isDragActive } = useDropzone({
		accept: FILE_ACCEPTS,
		disabled: currentFileCount >= maxFileCount,
		maxSize: MAX_FILE_SIZE,
		onDrop,
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
				data-testid="file-dropzone"
			>
				<input {...getInputProps()} />
				<Upload className="text-muted-foreground mx-auto size-12" />
				<p className="text-muted-foreground mt-2 text-sm">
					Drag &#39;n&#39; drop files here, or click to select files
				</p>
				{maxFileCount !== Infinity && (
					<p className="text-muted-foreground mt-2 text-xs">
						{currentFileCount} / {maxFileCount} files uploaded
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="relative">
			<input
				accept={Object.keys(FILE_ACCEPTS).join(", ")}
				className="sr-only"
				data-testid="file-input"
				disabled={currentFileCount >= maxFileCount}
				id={`file-upload-${fieldName}`}
				multiple={true}
				onChange={(e) => {
					if (e.target.files) {
						handleFilesAdded([...e.target.files]);
					}
					e.target.value = "";
				}}
				type="file"
			/>
			<Button
				asChild
				className={cn("text-sm", currentFileCount >= maxFileCount && "opacity-50 cursor-not-allowed")}
				data-testid="upload-files-button"
				size="sm"
				variant="outline"
			>
				<label htmlFor={`file-upload-${fieldName}`}>
					<Paperclip className="mr-2 size-4" />
					Upload Files
				</label>
			</Button>
			{maxFileCount !== Infinity && (
				<p className="text-muted-foreground mt-2 text-xs">
					{currentFileCount} / {maxFileCount} files uploaded
				</p>
			)}
		</div>
	);
}
