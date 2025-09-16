"use client";

import Image from "next/image";
import { useCallback } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithId } from "@/types/files";
import { formatBytes } from "@/utils/format";
import { log } from "@/utils/logger/client";

const FILE_ACCEPTS = {
	"application/csv": [".csv"],
	"application/latex": [".latex"],
	"application/msword": [".doc"],
	"application/pdf": [".pdf"],
	"application/rtf": [".rtf"],
	"application/vnd.ms-powerpoint": [".ppt"],
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

type SourceType = "application" | "template";

export function TemplateFileUploader({ parentId, sourceType }: { parentId?: string; sourceType: SourceType }) {
	const addFile = useApplicationStore((state) => state.addFile);
	const addPendingUpload = useApplicationStore((state) => state.addPendingUpload);
	const removePendingUpload = useApplicationStore((state) => state.removePendingUpload);
	const currentStep = useWizardStore((state) => state.currentStep);
	const { trackFileUpload } = useWizardAnalytics();

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
			log.info("[file-upload] Starting handleUploadFile", {
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
				parentId,
			});

			if (!parentId) {
				log.error("[file-upload] handleUploadFile failed - no parentId", {
					fileName: file.name,
				});
				return;
			}

			const fileWithId: FileWithId = Object.assign(file, { id: crypto.randomUUID() });

			addPendingUpload(fileWithId, sourceType);

			log.info("[file-upload] Created file with ID, calling addFile", {
				fileId: fileWithId.id,
				fileName: file.name,
				parentId,
			});

			// Track file upload attempt before calling addFile so analytics is captured even if it fails
			const step = currentStep === WizardStep.APPLICATION_DETAILS ? 1 : 3;
			await trackFileUpload(file.name, file.size, file.type, step);

			try {
				await addFile(fileWithId, parentId);
				log.info("[file-upload] addFile completed successfully", {
					fileId: fileWithId.id,
					fileName: file.name,
					parentId,
				});
			} catch (error) {
				removePendingUpload(fileWithId.id, sourceType);
				log.error("[file-upload] addFile failed, removed from pending uploads", {
					error,
					fileId: fileWithId.id,
					fileName: file.name,
					parentId,
				});
				throw error;
			}
		},
		[addFile, addPendingUpload, removePendingUpload, parentId, sourceType, currentStep, trackFileUpload],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			log.info("[file-upload] Starting handleFilesAdded", {
				fileCount: newFiles.length,
				fileNames: newFiles.map((f) => f.name),
				parentId,
			});

			if (!validateFileUploads(newFiles)) {
				log.error("[file-upload] File validation failed", {
					fileCount: newFiles.length,
					fileNames: newFiles.map((f) => f.name),
				});
				return;
			}

			log.info("[file-upload] File validation passed, starting uploads", {
				fileCount: newFiles.length,
			});

			try {
				await Promise.all(newFiles.map(handleUploadFile));
				log.info("[file-upload] All files uploaded successfully", {
					fileCount: newFiles.length,
					fileNames: newFiles.map((f) => f.name),
				});
			} catch (error) {
				log.error("[file-upload] One or more file uploads failed", {
					error,
					fileCount: newFiles.length,
					fileNames: newFiles.map((f) => f.name),
				});
				throw error;
			}
		},
		[handleUploadFile, validateFileUploads, parentId],
	);

	return (
		<div className="relative mt-5" data-testid="template-file-container">
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
			<AppButton
				className="text-sm font-normal leading-[22px]"
				data-testid="upload-files-button"
				leftIcon={<Image alt="Upload" height={16} src="/icons/upload-primary.svg" width={16} />}
				variant="secondary"
			>
				<label className="cursor-pointer" htmlFor="file-upload-template-files">
					Upload Documents
				</label>
			</AppButton>
		</div>
	);
}
