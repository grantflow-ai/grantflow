"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app-button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPreviewLogo } from "@/components/workspaces/icons";
import { DragDropSectionManager } from "@/components/workspaces/wizard/drag-drop-section-manager";
import FilePreviewCard from "@/components/workspaces/wizard/file-preview-card";
import LinkPreviewItem from "@/components/workspaces/wizard/link-preview-item";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
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

	return toGrantSectionRequestBody({
		id: section.id,
		max_words: 3000,
		order: section.order,
		parent_id: section.parent_id,
		title: section.title,
	});
};

const toGrantSectionRequestBody = (overrides: Partial<UpdateGrantSection> = {}): UpdateGrantSection => {
	const defaults: UpdateGrantSection = {
		depends_on: [],
		generation_instructions: "",
		id: `section-${crypto.randomUUID()}`,
		is_clinical_trial: null,
		is_detailed_workplan: null,
		keywords: [],
		max_words: 3000,
		order: 0,
		parent_id: null,
		search_queries: [],
		title: "Category Name",
		topics: [],
	};

	return {
		...defaults,
		...overrides,
	};
};

const ANALYZING_STEPS = [
	{
		steps: [
			"Analyzing the documents to capture every needed section and requirement.",
			"Reviewing the guidelines in detail so no needed section is overlooked.",
		],
		title: "Reading the call",
	},
	{
		steps: [
			"Translating the requirements into a section-by-section framework.",
			"Drafting a template that mirrors the grant application guidelines.",
		],
		title: "Building the outline",
	},
	{
		steps: [
			"Attaching description for each section to focus the draft generation.",
			"Pairing every section with clear guidance on what it should include.",
		],
		title: "Adding writing cues",
	},
	{
		steps: [
			"Running a quick consistency scan to confirm coverage and flow.",
			"Verifying the outline for gaps or overlap before displaying it.",
		],
		title: "Final check",
	},
];

export function ApplicationStructureStep() {
	return (
		<div className="flex size-full" data-testid="application-structure-step">
			<ApplicationStructureLeftPane />
			<ApplicationStructurePreview />
		</div>
	);
}

function ApplicationStructureLeftPane() {
	const { application, retrieveApplication } = useApplicationStore();
	const { checkTemplateRagJobStatus, grantTemplateRagJobData } = useWizardStore();

	const [visibleSteps, setVisibleSteps] = useState(0);

	const parentId = application?.grant_template?.id;

	const isGeneratingTemplate =
		grantTemplateRagJobData?.status === "PROCESSING" || grantTemplateRagJobData?.status === "PENDING";

	const templateFiles: FileWithId[] = useMemo(
		() =>
			(application?.grant_template?.rag_sources ?? [])
				.filter((source) => source.filename)
				.map((source) => {
					const file = new File([], source.filename!, { type: "application/octet-stream" });
					return Object.assign(file, { id: source.sourceId });
				}),
		[application?.grant_template?.rag_sources],
	);

	const templateUrls = useMemo(
		() =>
			(application?.grant_template?.rag_sources ?? [])
				.filter((source) => source.url)
				.map((source) => source.url!),
		[application?.grant_template?.rag_sources],
	);

	useEffect(() => {
		if (application?.grant_template?.rag_job_id) {
			void checkTemplateRagJobStatus();
		}
	}, [application?.grant_template?.rag_job_id, checkTemplateRagJobStatus]);

	useEffect(() => {
		if (grantTemplateRagJobData?.status === "COMPLETED" && application) {
			void retrieveApplication(application.workspace_id, application.id);
		}
	}, [grantTemplateRagJobData?.status, application, retrieveApplication]);

	usePollingCleanup();

	useEffect(() => {
		if (isGeneratingTemplate) {
			const interval = setInterval(() => {
				setVisibleSteps((prev) => {
					if (prev < ANALYZING_STEPS.length) {
						return prev + 1;
					}
					return prev;
				});
			}, 1000);

			return () => {
				clearInterval(interval);
			};
		}
		setVisibleSteps(0);
	}, [isGeneratingTemplate]);

	return (
		<div className="w-1/3 overflow-y-auto p-6 sm:w-1/2">
			<div className="space-y-6">
				<div>
					<h2
						className="font-heading text-2xl font-medium leading-loose"
						data-testid="application-structure-header"
					>
						Application Structure
					</h2>
					<p
						className="text-muted-foreground-dark leading-tight"
						data-testid="application-structure-description"
					>
						{isGeneratingTemplate
							? "Analyzing your knowledge base to generate the optimal structure..."
							: "Review and customize the structure of your grant application."}
					</p>
				</div>

				{isGeneratingTemplate ? (
					<div className="relative space-y-6">
						{ANALYZING_STEPS.map((section, sectionIndex) => (
							<div
								className={`transition-all duration-700 ${
									visibleSteps > sectionIndex
										? "translate-x-0 opacity-100"
										: "-translate-x-4 opacity-0"
								}`}
								key={sectionIndex}
							>
								<div className="relative">
									{sectionIndex < ANALYZING_STEPS.length - 1 && (
										<div
											className={`absolute left-3 top-8 h-full w-0.5 transition-all duration-500 ${
												visibleSteps > sectionIndex ? "bg-blue-200" : "bg-gray-200"
											}`}
										/>
									)}

									<div className="mb-3 flex items-center gap-3">
										<div
											className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
												visibleSteps > sectionIndex
													? "border-blue-500 bg-blue-500 text-white"
													: "border-gray-300 bg-white text-gray-400"
											}`}
										>
											<span className="text-xs font-medium">{sectionIndex + 1}</span>
										</div>
										<h4
											className={`font-medium transition-colors duration-300 ${
												visibleSteps > sectionIndex ? "text-gray-900" : "text-gray-400"
											}`}
										>
											{section.title}
										</h4>
										{visibleSteps === sectionIndex + 1 && (
											<div className="ml-2 size-2 animate-pulse rounded-full bg-blue-500" />
										)}
									</div>

									<div className="ml-9 space-y-2">
										{section.steps.map((step, stepIndex) => (
											<div
												className={`flex items-start gap-2 text-sm transition-all duration-300 ${
													visibleSteps > sectionIndex
														? "translate-x-0 opacity-100"
														: "-translate-x-2 opacity-0"
												}`}
												key={stepIndex}
												style={{
													transitionDelay: `${stepIndex * 100}ms`,
												}}
											>
												<span className="text-gray-400">{stepIndex + 1}.</span>
												<span
													className={`transition-colors duration-300 ${
														visibleSteps > sectionIndex ? "text-gray-700" : "text-gray-400"
													}`}
												>
													{step}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="space-y-4">
						<Card
							className="border-app-gray-100 border p-4 shadow-none"
							data-testid="application-documents-card"
						>
							<h3
								className="font-heading mb-2 text-base font-semibold"
								data-testid="application-documents-title"
							>
								Application Documents
							</h3>
							{templateFiles.length > 0 ? (
								<div className="flex gap-3">
									{templateFiles.map((file, index) => (
										<FilePreviewCard
											file={file}
											key={file.name + index.toString()}
											parentId={parentId}
										/>
									))}
								</div>
							) : (
								<p className="text-muted-foreground-dark text-sm" data-testid="no-documents-message">
									No documents uploaded yet.
								</p>
							)}
						</Card>

						{templateUrls.length > 0 && (
							<Card className="border-app-gray-100 border p-4 shadow-none">
								<h3 className="font-heading mb-2 text-base font-semibold">Links</h3>
								<div className="space-y-1">
									{templateUrls.map((url, index) => (
										<LinkPreviewItem key={url + index.toString()} parentId={parentId} url={url} />
									))}
								</div>
							</Card>
						)}
					</div>
				)}
			</div>
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
			const newSection = toGrantSectionRequestBody({
				order: grantSections.length,
				parent_id: parentId,
				title: isSubsection ? "Secondary Category Name" : "Category Name",
			});

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
