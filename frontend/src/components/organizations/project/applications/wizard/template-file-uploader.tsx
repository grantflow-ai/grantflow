"use client";

import { useCallback } from "react";
import { RagSourceFileUploader } from "@/components/shared/rag-source-file-uploader";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithId } from "@/types/files";
import { log } from "@/utils/logger/client";

type SourceType = "application" | "template";

export function TemplateFileUploader({ parentId, sourceType }: { parentId?: string; sourceType: SourceType }) {
	const addFile = useApplicationStore((state) => state.addFile);
	const addPendingUpload = useApplicationStore((state) => state.addPendingUpload);
	const removePendingUpload = useApplicationStore((state) => state.removePendingUpload);
	const currentStep = useWizardStore((state) => state.currentStep);
	const { trackFileUpload } = useWizardAnalytics();

	const handleFileAdd = useCallback(
		async (file: FileWithId) => {
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

			addPendingUpload(file, sourceType);

			log.info("[file-upload] Created file with ID, calling addFile", {
				fileId: file.id,
				fileName: file.name,
				parentId,
			});

			const step = currentStep === WizardStep.APPLICATION_DETAILS ? 1 : 3;
			await trackFileUpload(file.name, file.size, file.type, step);

			try {
				await addFile(file, parentId);
				log.info("[file-upload] addFile completed successfully", {
					fileId: file.id,
					fileName: file.name,
					parentId,
				});
			} catch (error) {
				removePendingUpload(file.id, sourceType);
				log.error("[file-upload] addFile failed, removed from pending uploads", {
					error,
					fileId: file.id,
					fileName: file.name,
					parentId,
				});
				throw error;
			}
		},
		[addFile, addPendingUpload, removePendingUpload, parentId, sourceType, currentStep, trackFileUpload],
	);

	const handleFileRemove = useCallback(
		(fileId: string) => {
			removePendingUpload(fileId, sourceType);
		},
		[removePendingUpload, sourceType],
	);

	return <RagSourceFileUploader onFileAdd={handleFileAdd} onFileRemove={handleFileRemove} testId="template-file" />;
}
