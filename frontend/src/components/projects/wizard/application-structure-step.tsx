"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { AppButton } from "@/components/app-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPreviewLogo } from "@/components/projects/icons";
import ApplicationStructureLeftPane from "@/components/projects/wizard/application-structure-left-pane";
import { DragDropSectionManager } from "@/components/projects/wizard/drag-drop-section-manager";
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
		is_detailed_workplan: null,
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
	return (
		<div className="flex size-full" data-testid="application-structure-step">
			<ApplicationStructureLeftPane />
			<ApplicationStructurePreview />
		</div>
	);
}

function ApplicationStructurePreview() {
	const { application, updateGrantSections } = useApplicationStore();
	const { grantTemplateRagJobData } = useWizardStore();

	const isGeneratingTemplate =
		grantTemplateRagJobData?.status === "PROCESSING" || grantTemplateRagJobData?.status === "PENDING";

	const grantSections = application?.grant_template?.grant_sections ?? [];

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			const isSubsection = parentId !== null;
			const newSection: UpdateGrantSection = {
				depends_on: [],
				generation_instructions: "",
				id: `section-${crypto.randomUUID()}`,
				is_clinical_trial: null,
				is_detailed_workplan: null,
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

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-6">
			{(() => {
				if (!application) {
					return <EmptyStateView />;
				}
				if (isGeneratingTemplate) {
					return <GeneratingLoader />;
				}
				return (
					<SectionEditor
						isDetailedSection={isDetailedSection}
						onAddSection={handleAddNewSection}
						toUpdateGrantSection={toUpdateGrantSection}
					/>
				);
			})()}
		</div>
	);
}

function EmptyStateView() {
	return (
		<div className="flex h-full flex-col items-center justify-center" data-testid="empty-state">
			<IconPreviewLogo height={180} width={180} />
			<p className="text-muted-foreground-dark mt-6 text-center text-sm" data-testid="empty-state-message">
				Configure your application structure to see a preview
			</p>
		</div>
	);
}

function GeneratingLoader() {
	return (
		<div className="flex h-full flex-col items-center justify-center">
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
	toUpdateGrantSection,
}: {
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
}) {
	return (
		<div data-testid="application-structure-sections">
			<PreviewHeader onAddSection={onAddSection} />
			<ScrollArea className="flex-1">
				<DragDropSectionManager
					isDetailedSection={isDetailedSection}
					onAddSection={onAddSection}
					toUpdateGrantSection={toUpdateGrantSection}
				/>
			</ScrollArea>
		</div>
	);
}
