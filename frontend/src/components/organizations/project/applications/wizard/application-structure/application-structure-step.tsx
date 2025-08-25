"use client";

import Image from "next/image";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { createRagSourcesDialog } from "@/components/organizations/project/applications/wizard/modal/rag-sources-dialog-utils";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { GrantSection } from "@/types/grant-sections";
import { ApplicationStructureLeftPane } from "./application-structure-left-pane";
import { DragDropSectionManager } from "./drag-drop-section-manager";

const isDetailedSection = (
	section: GrantSection,
): section is API.UpdateGrantTemplate.RequestBody["grant_sections"][0] => {
	return "max_words" in section;
};

interface ApplicationStructureStepProps {
	dialogRef: RefObject<null | WizardDialogRef>;
}

export function ApplicationStructureStep({ dialogRef }: ApplicationStructureStepProps) {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);
	const pollingIsActive = useWizardStore((state) => state.polling.isActive);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const startTemplateGeneration = useWizardStore((state) => state.startTemplateGeneration);

	const templateRagSources = grantTemplate?.rag_sources ?? [];
	const dialogDismissedRef = useRef(false);

	const canStartTemplateGeneration = useCallback(() => {
		if (!grantTemplate) return false;
		if (grantTemplate.grant_sections.length > 0) return false;
		if (isGeneratingTemplate) return false;
		return !pollingIsActive;
	}, [grantTemplate, isGeneratingTemplate, pollingIsActive]);

	useEffect(() => {
		if (templateRagSources.length === 0) return;

		const allFinished = templateRagSources.every((source) => source.status === "FINISHED");
		if (allFinished && canStartTemplateGeneration()) {
			startTemplateGeneration();
			return;
		}

		const hasIndexingSources = templateRagSources.some((source) => source.status === "INDEXING");
		if (hasIndexingSources) {
			return;
		}

		const hasFailedSources = templateRagSources.some((source) => source.status === "FAILED");

		if (!hasFailedSources && canStartTemplateGeneration()) {
			startTemplateGeneration();
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
						startTemplateGeneration();
					}
				},
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
		startTemplateGeneration,
		toPreviousStep,
		grantTemplate?.grant_sections.length,
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
		<WizardRightPane padding="p-5 md:p-6" testId="application-structure-preview-pane">
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
				width={96}
			/>
		</div>
	);
}
