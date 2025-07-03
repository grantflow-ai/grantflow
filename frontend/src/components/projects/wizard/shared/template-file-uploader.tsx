"use client";

import Image from "next/image";
import { useCallback } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
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

const FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = FILE_SIZE_MB * 1024 * 1024;

export function TemplateFileUploader({ parentId }: { parentId?: string }) {
	const addFile = useApplicationStore((state) => state.addFile);

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
			if (!parentId) return;
			const fileWithId: FileWithId = Object.assign(file, { id: crypto.randomUUID() });
			await addFile(fileWithId, parentId);
		},
		[addFile, parentId],
	);

	const handleFilesAdded = useCallback(
		async (newFiles: File[]) => {
			if (!validateFileUploads(newFiles)) {
				return;
			}

			await Promise.all(newFiles.map(handleUploadFile));
		},
		[handleUploadFile, validateFileUploads],
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
				leftIcon={
					<Image alt="Upload" className="text-primary" height={16} src="/icons/upload.svg" width={16} />
				}
				variant="secondary"
			>
				<label className="cursor-pointer" htmlFor="file-upload-template-files">
					Upload Documents
				</label>
			</AppButton>
		</div>
	);
}
