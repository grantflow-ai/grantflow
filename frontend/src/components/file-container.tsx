"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createApplicationSourceUploadUrl, deleteApplicationSource } from "@/actions/sources";
import { API } from "@/types/api-types";
import { extractObjectPathFromUrl, triggerDevIndexing } from "@/utils/dev-indexing-patch";

import { FileUploader } from "./file-uploader";
import { FilesDisplay } from "./files-display";

interface FileContainerProps {
	applicationId: string;
	initialFiles?: Extract<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody[number], { filename: string }>[];
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
			// In development, bypass signed URL creation and upload directly to GCS emulator
			if (process.env.NODE_ENV === "development") {
				const objectPath = `workspace/${workspaceId}/grant_application/${applicationId}/${file.name}`;
				const emulatorUrl = `http://localhost:4443/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=${objectPath}`;

				const uploadResponse = await fetch(emulatorUrl, {
					body: file,
					headers: {
						"Content-Type": file.type,
					},
					method: "POST",
				});

				if (!uploadResponse.ok) {
					throw new Error(`Failed to upload file ${file.name}`);
				}

				setUploadedFiles((prev) => [...prev, file]);
				toast.success(`File ${file.name} uploaded successfully`);

				// Trigger indexing directly
				void triggerDevIndexing(objectPath);
				return;
			}

			// Production path: use signed URLs
			const { url } = await createApplicationSourceUploadUrl(workspaceId, applicationId, file.name);

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

			const objectPath = extractObjectPathFromUrl(url);
			if (objectPath) {
				void triggerDevIndexing(objectPath);
			}
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
					await deleteApplicationSource(workspaceId, applicationId, file.id);
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

			{isUploading && <div className="text-muted-foreground text-center text-sm">Uploading files...</div>}
		</div>
	);
}
