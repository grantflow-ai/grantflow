"use client";

import Image from "next/image";
import { useCallback } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { FILE_ACCEPTS, MAX_FILE_SIZE_BYTES } from "@/constants/file-upload";
import type { FileWithId } from "@/types/files";
import { formatBytes } from "@/utils/format";
import { log } from "@/utils/logger/client";

interface RagSourceFileUploaderProps {
	onFileAdd: (file: FileWithId) => Promise<void>;
	onFileRemove?: (fileId: string) => void;
	testId?: string;
}

export function RagSourceFileUploader({ onFileAdd, onFileRemove, testId }: RagSourceFileUploaderProps) {
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
			});

			const fileWithId: FileWithId = Object.assign(file, { id: crypto.randomUUID() });

			try {
				await onFileAdd(fileWithId);
				log.info("[file-upload] File upload completed successfully", {
					fileId: fileWithId.id,
					fileName: file.name,
				});
			} catch (error) {
				if (onFileRemove) {
					onFileRemove(fileWithId.id);
				}
				log.error("[file-upload] File upload failed", {
					error,
					fileId: fileWithId.id,
					fileName: file.name,
				});
				throw error;
			}
		},
		[onFileAdd, onFileRemove],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			log.info("[file-upload] Starting handleFilesAdded", {
				fileCount: newFiles.length,
				fileNames: newFiles.map((f) => f.name),
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
		[handleUploadFile, validateFileUploads],
	);

	const inputId = testId ? `${testId}-file-input` : "file-upload-rag-source";

	return (
		<div className="relative mt-5" data-testid={testId ? `${testId}-container` : "rag-source-file-container"}>
			<input
				accept={Object.keys(FILE_ACCEPTS).join(", ")}
				className="sr-only"
				data-testid={testId ? `${testId}-input` : "file-input"}
				id={inputId}
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
				data-testid={testId ? `${testId}-button` : "upload-files-button"}
				leftIcon={<Image alt="Upload" height={16} src="/icons/upload-primary.svg" width={16} />}
				variant="secondary"
			>
				<label className="cursor-pointer" htmlFor={inputId}>
					Upload Documents
				</label>
			</AppButton>
		</div>
	);
}
