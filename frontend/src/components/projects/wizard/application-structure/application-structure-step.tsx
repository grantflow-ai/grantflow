"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { ApplicationStructureLeftPane, DragDropSectionManager } from "@/components/projects";
import { WizardRightPane } from "@/components/projects/wizard/shared";
import { createRagSourcesDialog } from "@/components/projects/wizard/shared/rag-sources-dialog-utils";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWizardDialog } from "@/hooks/use-wizard-dialog";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";

const isDetailedSection = (
	section: GrantSection,
): section is API.UpdateGrantTemplate.RequestBody["grant_sections"][0] => {
	return "max_words" in section;
};

const toUpdateGrantSection = (section: GrantSection): UpdateGrantSection => {
	if (isDetailedSection(section)) {
		return section;
	}

	return {
		depends_on: [],
		generation_instructions: "",
		id: section.id,
		is_clinical_trial: null,
		is_detailed_research_plan: null,
		keywords: [],
		max_words: 3000,
		order: section.order,
		parent_id: section.parent_id,
		search_queries: [],
		title: section.title,
		topics: [],
	};
};

export function ApplicationStructureStep() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);
	const pollingIsActive = useWizardStore((state) => state.polling.isActive);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const toPreviousStep = useWizardStore((state) => state.toPreviousStep);
	const startTemplateGeneration = useWizardStore((state) => state.startTemplateGeneration);

	const templateRagSources = grantTemplate?.rag_sources ?? [];

	const { closeDialog, openDialog } = useWizardDialog();

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

		// Show dialog for failed sources
		const ragDialog = createRagSourcesDialog({
			onBackToUploads: () => {
				closeDialog();
				toPreviousStep();
			},
			onContinue: () => {
				closeDialog();
				if (canStartTemplateGeneration()) startTemplateGeneration();
			},
		});

		openDialog("Review Required: Some Uploads Failed", ragDialog.content, {
			description:
				"We couldn't process one or more of your files or links. To ensure accurate analysis, please upload all required documents.",
			footer: ragDialog.footer,
		});
	}, [
		canStartTemplateGeneration,
		templateRagSources,
		closeDialog,
		openDialog,
		startTemplateGeneration,
		toPreviousStep,
	]);

	return (
		<div className="flex size-full" data-testid="application-structure-step">
			<ApplicationStructureLeftPane />
			<ApplicationStructurePreview />
		</div>
	);
}

function ApplicationStructurePreview() {
	const application = useApplicationStore((state) => state.application);
	const updateGrantSections = useApplicationStore((state) => state.updateGrantSections);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);

	const grantSections = application?.grant_template?.grant_sections ?? [];

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			const isSubsection = parentId !== null;
			const newSection: UpdateGrantSection = {
				depends_on: [],
				generation_instructions: "",
				id: `section-${crypto.randomUUID()}`,
				is_clinical_trial: null,
				is_detailed_research_plan: null,
				keywords: [],
				max_words: 3000,
				order: grantSections.length,
				parent_id: parentId,
				search_queries: [],
				title: isSubsection ? "Secondary Category Name" : "Category Name",
				topics: [],
			};

			const updatedSections: UpdateGrantSection[] = [...grantSections.map(toUpdateGrantSection), newSection];
			await updateGrantSections(updatedSections);
		},
		[grantSections, updateGrantSections],
	);

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
			<SectionEditor isDetailedSection={isDetailedSection} onAddSection={handleAddNewSection} />
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

function PreviewHeader({ onAddSection }: { onAddSection: (parentId?: null | string) => Promise<void> }) {
	return (
		<div className="mb-2 flex justify-end">
			<AppButton
				data-testid="add-new-section-button"
				leftIcon={<Plus />}
				onClick={() => onAddSection()}
				size="sm"
				variant="secondary"
			>
				Add New Section
			</AppButton>
		</div>
	);
}

function SectionEditor({
	isDetailedSection,
	onAddSection,
}: {
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
}) {
	return (
		<div className="flex flex-col size-full" data-testid="application-structure-sections">
			<PreviewHeader onAddSection={onAddSection} />
			<ScrollArea className="flex-1">
				<DragDropSectionManager isDetailedSection={isDetailedSection} onAddSection={onAddSection} />
			</ScrollArea>
		</div>
	);
}
