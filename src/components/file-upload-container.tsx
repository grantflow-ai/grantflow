import { useCallback, useEffect, useState } from "react";
import { FileUploader } from "@/components/file-uploader";
import { FileCard } from "@/components/file-card";

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
const DEFAULT_MAX_FILES = 5;

export function FileUploadContainer({
	accept = DEFAULT_FILE_ACCEPTS,
	maxSize = DEFAULT_MAX_SIZE,
	maxFileCount = DEFAULT_MAX_FILES,
	initialValue,
	setFileData,
}: {
	accept?: string[];
	maxSize?: number;
	maxFileCount?: number;
	initialValue?: File[];
	setFileData: (fileData: File[]) => void;
}) {
	const [files, setFiles] = useState<File[]>(initialValue ?? []);

	useEffect(() => {
		setFileData(files);
	}, [files, setFileData]);

	const handleFilesAdded = useCallback((newFiles: File[]) => {
		const fileData: File[] = newFiles.map((file) => {
			Reflect.set(file, "previewUrl", file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined);
			return file;
		});

		setFiles((prevFiles) => [...prevFiles, ...fileData]);
	}, []);

	const handleRemoveFile = useCallback((fileToRemove: File) => {
		if (Reflect.has(fileToRemove, "previewUrl")) {
			URL.revokeObjectURL(Reflect.get(fileToRemove, "previewUrl") as string);
		}

		setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileToRemove.name));
	}, []);

	return (
		<div className="space-y-4">
			<FileUploader
				accept={accept}
				maxSize={maxSize}
				maxFileCount={maxFileCount}
				currentFileCount={files.length}
				onFilesAdded={handleFilesAdded}
			/>
			{files.length > 0 && (
				<div className="space-y-2">
					{files.map((file) => (
						<FileCard
							key={file.name}
							file={file}
							onRemove={() => {
								handleRemoveFile(file);
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
