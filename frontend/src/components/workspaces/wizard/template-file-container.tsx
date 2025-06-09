"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createTemplateSourceUploadUrl, deleteTemplateSource } from "@/actions/sources";
import { FileUploader } from "@/components/file-uploader";
import { FilesDisplay } from "@/components/files-display";
import { API } from "@/types/api-types";
import { extractObjectPathFromUrl, triggerDevIndexing } from "@/utils/dev-indexing-patch";
import { logError } from "@/utils/logging";

type FileWithId = { id?: string } & File;

interface TemplateFileContainerProps {
	initialFiles?: Extract<API.RetrieveGrantTemplateRagSources.Http200.ResponseBody[number], { filename: string }>[];
	maxFileCount?: number;
	onFileCountChange?: (count: number) => void;
	onFilesChange?: (files: FileWithId[]) => void;
	templateId: string;
	workspaceId: string;
}

export function TemplateFileContainer({
	initialFiles = [],
	maxFileCount = 10,
	onFileCountChange,
	onFilesChange,
	templateId,
	workspaceId,
}: TemplateFileContainerProps) {
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

	useEffect(() => {
		onFileCountChange?.(uploadedFiles.length);
		onFilesChange?.(uploadedFiles);
	}, [uploadedFiles, onFileCountChange, onFilesChange]);

	const handleUploadFile = useCallback(
		async (file: File) => {
			// In development, bypass signed URL creation and upload directly to GCS emulator
			if (process.env.NODE_ENV === "development") {
				const objectPath = `workspace/${workspaceId}/grant_template/${templateId}/${file.name}`;
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
			const { url } = await createTemplateSourceUploadUrl(workspaceId, templateId, file.name);

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

			// Development-only: Trigger indexing since fake-gcs-server doesn't send Pub/Sub events ~keep
			const objectPath = extractObjectPathFromUrl(url);
			if (objectPath) {
				void triggerDevIndexing(objectPath);
			}
		},
		[workspaceId, templateId],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			setIsUploading(true);

			try {
				await Promise.all(newFiles.map(handleUploadFile));
			} catch (error) {
				logError({ error, identifier: "handleFilesAdded" });
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
					await deleteTemplateSource(workspaceId, templateId, file.id);
				}

				setUploadedFiles((prev) => prev.filter((f) => f.name !== fileToRemove.name));

				toast.success(`File ${fileToRemove.name} removed`);
			} catch {
				toast.error("Failed to remove file. Please try again.");
			}
		},
		[workspaceId, templateId, uploadedFiles],
	);

	return (
		<div data-testid="template-file-container">
			<FileUploader
				currentFileCount={uploadedFiles.length}
				fieldName="template-files"
				maxFileCount={maxFileCount}
				onFilesAdded={handleFilesAdded}
			/>

			{uploadedFiles.length > 0 && (
				<div className="mt-4">
					<FilesDisplay files={uploadedFiles} onFileRemoved={handleFileRemoved} />
				</div>
			)}

			{isUploading && <div className="text-muted-foreground mt-2 text-center text-sm">Uploading files...</div>}
		</div>
	);
}
