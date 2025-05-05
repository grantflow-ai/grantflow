"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUploader } from "./file-uploader";
import { FilesDisplay } from "./files-display";
import { createUploadUrl, deleteApplicationFile } from "@/actions/application-files";
import { API } from "@/types/api-types";

interface FileContainerProps {
	applicationId: string;
	initialFiles?: API.ListApplicationFiles.Http200.ResponseBody;
	maxFileCount?: number;
	workspaceId: string;
}

type FileWithId = { id?: string } & File;

export function FileContainer({
	applicationId,
	initialFiles = [],
	maxFileCount = 10,
	workspaceId,
}: FileContainerProps) {
	const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	useEffect(() => {
		if (initialFiles.length > 0 && uploadedFiles.length === 0) {
			const files = initialFiles.map((serverFile) => {
				const file = new File([], serverFile.filename, { type: serverFile.mime_type });

				Object.defineProperty(file, "size", {
					value: serverFile.size,
					writable: false,
				});

				const fileWithId = file as FileWithId;
				fileWithId.id = serverFile.id;

				return fileWithId;
			});

			setUploadedFiles(files);
		}
	}, [initialFiles, uploadedFiles.length]);

	const handleUploadFile = useCallback(
		async (file: File) => {
			const { url } = await createUploadUrl(workspaceId, applicationId, file.name);

			const uploadResponse = await fetch(url, {
				body: file,
				headers: {
					"Content-Type": file.type,
				},
				method: "PUT",
			});

			if (!uploadResponse.ok) {
				throw new Error(`Failed to upload file ${file.name}`);
			}

			setUploadedFiles((prev) => [...prev, file]);

			toast.success(`File ${file.name} uploaded successfully`);
		},
		[workspaceId, applicationId],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			setIsUploading(true);

			try {
				await Promise.all(newFiles.map(handleUploadFile));
			} catch {
				toast.error("Failed to upload file. Please try again.");
			} finally {
				setIsUploading(false);
			}
		},
		[handleUploadFile],
	);

	const handleFileRemoved = useCallback(
		async (fileToRemove: File) => {
			try {
				const file = uploadedFiles.find((f) => f.name === fileToRemove.name);

				if (!file) {
					return;
				}

				if (file.id) {
					await deleteApplicationFile(workspaceId, applicationId, file.id);
				}

				setUploadedFiles((prev) => prev.filter((f) => f.name !== fileToRemove.name));

				toast.success(`File ${fileToRemove.name} removed`);
			} catch {
				toast.error("Failed to remove file. Please try again.");
			}
		},
		[workspaceId, applicationId, uploadedFiles],
	);

	return (
		<div className="space-y-4">
			<FileUploader
				currentFileCount={uploadedFiles.length}
				fieldName="application-files"
				isDropZone={true}
				maxFileCount={maxFileCount}
				onFilesAdded={handleFilesAdded}
			/>

			{uploadedFiles.length > 0 && <FilesDisplay files={uploadedFiles} onFileRemoved={handleFileRemoved} />}

			{isUploading && <div className="text-center text-sm text-muted-foreground">Uploading files...</div>}
		</div>
	);
}
