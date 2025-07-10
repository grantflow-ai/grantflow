"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { ApplicationStructureLeftPane, DragDropSectionManager } from "@/components/projects";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	const application = useApplicationStore((state) => state.application);
	const generateTemplate = useApplicationStore((state) => state.generateTemplate);
	const checkTemplateGeneration = useWizardStore((state) => state.checkTemplateGeneration);
	const polling = useWizardStore((state) => state.polling);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);

	useEffect(() => {
		if (application?.grant_template && !application.grant_template.grant_sections.length && !polling.isActive) {
			void generateTemplate(application.grant_template.id);
			setGeneratingTemplate(true);
			polling.start(checkTemplateGeneration, 2000, false);
		}
	}, [application, generateTemplate, checkTemplateGeneration, polling, setGeneratingTemplate]);

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
			<div
				className="bg-preview-bg flex flex-1 size-full overflow-y-auto border-l border-app-gray-100"
				data-testid="application-structure-preview-pane"
			>
				<EmptyStateView />
			</div>
		);
	}

	if (isGeneratingTemplate) {
		return (
			<div
				className="bg-preview-bg flex flex-1 size-full overflow-y-auto border-l border-app-gray-100"
				data-testid="application-structure-preview-pane"
			>
				<GeneratingLoader />
			</div>
		);
	}

	return (
		<div
			className="bg-preview-bg flex flex-1 size-full overflow-y-auto border-l border-app-gray-100"
			data-testid="application-structure-preview-pane"
		>
			<SectionEditor
				isDetailedSection={isDetailedSection}
				onAddSection={handleAddNewSection}
				toUpdateGrantSection={toUpdateGrantSection}
			/>
		</div>
	);
}

function EmptyStateView() {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center" data-testid="empty-state">
			<div className="relative">
				<div className="flex size-96 items-center justify-center">
					<div className="relative">
						{}
						<div className="bg-gray-100 animate-pulse flex size-24 items-center justify-center rounded-full">
							<div className="bg-gray-200 size-12 rounded-full" />
						</div>

						{}
						<div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
							<div className="bg-blue-100 absolute -top-4 left-1/2 size-8 -translate-x-1/2 rounded-full" />
						</div>
						<div
							className="absolute inset-0 animate-spin"
							style={{ animationDirection: "reverse", animationDuration: "4s" }}
						>
							<div className="bg-purple-100 absolute -bottom-4 left-1/2 size-6 -translate-x-1/2 rounded-full" />
						</div>
						<div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s" }}>
							<div className="bg-green-100 absolute -left-4 top-1/2 size-4 -translate-y-1/2 rounded-full" />
						</div>
					</div>
				</div>
			</div>
			<p className="text-muted-foreground-dark mt-6 text-center text-sm" data-testid="empty-state-message">
				Loading, analyzing...
			</p>
		</div>
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
	toUpdateGrantSection,
}: {
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
}) {
	return (
		<div className="flex flex-col size-full p-5 md:p-7" data-testid="application-structure-sections">
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
