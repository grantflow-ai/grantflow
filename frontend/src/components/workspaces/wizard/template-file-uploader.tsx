"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { createTemplateSourceUploadUrl } from "@/actions/sources";
import { AppButton } from "@/components/app-button";
import { IconUpload } from "@/components/workspaces/icons";
import { useApplicationStore } from "@/stores/application-store";
import { extractObjectPathFromUrl, triggerDevIndexing } from "@/utils/dev-indexing-patch";
import { formatBytes } from "@/utils/format";
import { logError } from "@/utils/logging";

type FileWithId = { id: string } & File;

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

const FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = FILE_SIZE_MB * 1024 * 1024;

export function TemplateFileUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
	const { addFile, application } = useApplicationStore();

	const validateFileUploads = useCallback((newFileUploads: File[]) => {
		for (const file of newFileUploads) {
			if (file.size > MAX_FILE_SIZE_BYTES) {
				toast.error(
					`File ${file.name} is too large. The max size per file is ${formatBytes(MAX_FILE_SIZE_BYTES)}`,
				);
				return false;
			}
		}

		return true;
	}, []);

	const handleUploadFile = useCallback(
		async (file: File) => {
			if (!application?.grant_template?.id) {
				toast.error("Cannot upload file: Template not found");
				return;
			}

			// In development, bypass signed URL creation and upload directly to GCS emulator
			if (process.env.NODE_ENV === "development") {
				const objectPath = `workspace/${application.workspace_id}/grant_template/${application.grant_template.id}/${file.name}`;
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

				const fileWithId: FileWithId = Object.assign(file, { id: file.name });
				addFile(fileWithId);
				toast.success(`File ${file.name} uploaded successfully`);

				// Trigger indexing directly
				void triggerDevIndexing(objectPath);

				// Notify parent of upload completion
				onUploadComplete?.();
				return;
			}

			// Production path: use signed URLs
			const { url } = await createTemplateSourceUploadUrl(
				application.workspace_id,
				application.grant_template.id,
				file.name,
			);

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

			const fileWithId: FileWithId = Object.assign(file, { id: file.name });
			addFile(fileWithId);

			toast.success(`File ${file.name} uploaded successfully`);

			// Development-only: Trigger indexing since fake-gcs-server doesn't send Pub/Sub events ~keep
			const objectPath = extractObjectPathFromUrl(url);
			if (objectPath) {
				void triggerDevIndexing(objectPath);
			}

			// Notify parent of upload completion
			onUploadComplete?.();
		},
		[application, addFile, onUploadComplete],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			if (!validateFileUploads(newFiles)) {
				return;
			}

			try {
				await Promise.all(newFiles.map(handleUploadFile));
			} catch (error) {
				logError({ error, identifier: "handleFilesAdded" });
				toast.error("Failed to upload file. Please try again.");
			}
		},
		[handleUploadFile, validateFileUploads],
	);

	return (
		<div className="relative" data-testid="template-file-container">
			<input
				accept={Object.keys(FILE_ACCEPTS).join(", ")}
				className="sr-only"
				data-testid="file-input"
				id="file-upload-template-files"
				multiple={true}
				onChange={(e) => {
					if (e.target.files) {
						void handleFilesAdded([...e.target.files]);
					}
					e.target.value = "";
				}}
				type="file"
			/>
			<AppButton data-testid="upload-files-button" leftIcon={<IconUpload />} variant="secondary">
				<label htmlFor="file-upload-template-files">Upload Documents</label>
			</AppButton>
		</div>
	);
}
