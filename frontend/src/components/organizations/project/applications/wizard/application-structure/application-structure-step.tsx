"use client";

import Image from "next/image";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createRagSourcesDialog } from "@/components/organizations/project/applications/wizard/modal/rag-sources-dialog-utils";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useWaitForSourcesReady } from "@/hooks/use-wait-for-sources-ready";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { GrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger/client";
import { ApplicationStructureLeftPane } from "./application-structure-left-pane";
import { DragDropSectionManager } from "./drag-drop-section-manager";

const isDetailedSection = (
	section: GrantSection,
): section is NonNullable<API.UpdateGrantTemplate.RequestBody["grant_sections"]>[0] => {
	return Object.hasOwn(section, "generation_instructions");
};

interface ApplicationStructureStepProps {
	dialogRef: RefObject<null | WizardDialogRef>;
}

export function ApplicationStructureStep({ dialogRef }: ApplicationStructureStepProps) {
	const application = useApplicationStore((state) => state.application);
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const templateGenerationFailed = useWizardStore((state) => state.templateGenerationFailed);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const shouldTriggerTemplateGeneration = useWizardStore((state) => state.shouldTriggerTemplateGeneration);

	const { isWaiting, waitForSources } = useWaitForSourcesReady({
		applicationId: application?.id ?? "",
	});

	const templateRagSources = grantTemplate?.rag_sources ?? [];
	const dialogDismissedRef = useRef(false);

	const canStartTemplateGeneration = useCallback(() => {
		if (!grantTemplate) return false;
		if (isGeneratingTemplate) return false;
		if (templateGenerationFailed) return false;

		return shouldTriggerTemplateGeneration();
	}, [grantTemplate, isGeneratingTemplate, templateGenerationFailed, shouldTriggerTemplateGeneration]);

	const startTemplateGenerationWithWait = useCallback(async () => {
		if (!canStartTemplateGeneration()) return;

		try {
			// Get all template source IDs that might be PENDING_UPLOAD
			const sourceIds = templateRagSources.map((source) => source.sourceId);

			if (sourceIds.length > 0) {
				log.info("[ApplicationStructureStep] Waiting for sources to be ready before template generation", {
					sourceCount: sourceIds.length,
					sourceIds,
				});

				// Wait for sources to transition from PENDING_UPLOAD
				await waitForSources(sourceIds);

				log.info("[ApplicationStructureStep] All sources ready, starting template generation");
			}

			// Start template generation
			await useWizardStore.getState().startTemplateGeneration();
		} catch (error) {
			log.error("[ApplicationStructureStep] Failed to wait for sources or start generation", { error });
			toast.error("Failed to start template generation. Please try again.");
		}
	}, [canStartTemplateGeneration, templateRagSources, waitForSources]);

	useEffect(() => {
		if (templateRagSources.length === 0) return;
		if (isWaiting) return; // Don't trigger if already waiting

		const allFinished = templateRagSources.every((source) => source.status === "FINISHED");
		if (allFinished && canStartTemplateGeneration()) {
			void startTemplateGenerationWithWait();
			return;
		}

		const hasIndexingSources = templateRagSources.some((source) => source.status === "INDEXING");
		if (hasIndexingSources) {
			return;
		}

		// Check for PENDING_UPLOAD sources
		const hasPendingUpload = templateRagSources.some((source) => source.status === "PENDING_UPLOAD");
		if (hasPendingUpload) {
			log.info("[ApplicationStructureStep] Sources still pending upload, will wait before generation");
			return;
		}

		const hasFailedSources = templateRagSources.some((source) => source.status === "FAILED");

		if (!hasFailedSources && canStartTemplateGeneration()) {
			void startTemplateGenerationWithWait();
			return;
		}

		if (hasFailedSources && !dialogDismissedRef.current && !grantTemplate?.grant_sections.length) {
			const ragDialog = createRagSourcesDialog({
				onBackToUploads: () => {
					dialogDismissedRef.current = true;
					dialogRef.current?.close();
					toPreviousStep();
				},
				onContinue: () => {
					dialogDismissedRef.current = true;
					dialogRef.current?.close();
					if (canStartTemplateGeneration()) {
						void startTemplateGenerationWithWait();
					}
				},
				sourceType: "template",
			});

			dialogRef.current?.open({
				content: ragDialog.content,
				description:
					"We couldn't process one or more of your files or links. To ensure accurate analysis, please upload all required documents.",
				dismissOnOutsideClick: false,
				footer: ragDialog.footer,
				minWidth: "min-w-4xl",
				title: "Review Required: Some Uploads Failed",
			});
		}
	}, [
		canStartTemplateGeneration,
		templateRagSources,
		dialogRef,
		toPreviousStep,
		grantTemplate?.grant_sections.length,
		startTemplateGenerationWithWait,
		isWaiting,
	]);

	return (
		<div className="flex size-full" data-testid="application-structure-step">
			<ApplicationStructureLeftPane />
			<ApplicationStructurePreview dialogRef={dialogRef} />
		</div>
	);
}

function ApplicationStructurePreview({ dialogRef }: { dialogRef: RefObject<null | WizardDialogRef> }) {
	const application = useApplicationStore((state) => state.application);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);

	const grantSections = application?.grant_template?.grant_sections ?? [];

	if (!application) {
		return (
			<WizardRightPane padding="p-5 md:p-6" testId="application-structure-preview-pane">
				<EmptyStatePreview />
			</WizardRightPane>
		);
	}

	if (isGeneratingTemplate) {
		return (
			<WizardRightPane padding="p-5 md:p-6" testId="application-structure-preview-pane">
				<GeneratingLoader />
			</WizardRightPane>
		);
	}

	if (!grantSections.length) {
		return (
			<WizardRightPane padding="p-5 md:p-6" testId="application-structure-preview-pane">
				<EmptyStatePreview />
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="p-4 2xl:p-6" testId="application-structure-preview-pane">
			<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={isDetailedSection} />
		</WizardRightPane>
	);
}

function GeneratingLoader() {
	return (
		<div className="flex size-full flex-col items-center justify-center">
			<Image
				alt="Analyzing data"
				className="size-96 object-contain"
				height={96}
				src="/animations/analyzing-loader.gif"
				unoptimized
				width={96}
			/>
		</div>
	);
}
