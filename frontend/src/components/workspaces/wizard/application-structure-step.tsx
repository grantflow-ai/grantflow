"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Plus } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPreviewLogo } from "@/components/workspaces/icons";
import FilePreviewCard from "@/components/workspaces/wizard/file-preview-card";
import LinkPreviewItem from "@/components/workspaces/wizard/link-preview-item";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";

type GrantSection = NonNullable<
	NonNullable<API.RetrieveApplication.Http200.ResponseBody["grant_template"]>
>["grant_sections"][0];

const isDetailedSection = (
	section: GrantSection,
): section is API.UpdateGrantTemplate.RequestBody["grant_sections"][0] => {
	return "max_words" in section;
};

interface SectionFormData {
	isResearchPlan?: boolean;
	max_words: number;
	title: string;
	useWords: boolean;
}

type UpdateGrantSection = API.UpdateGrantTemplate.RequestBody["grant_sections"][0];

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

interface SortableSectionProps {
	isDragging?: boolean;
	isExpanded: boolean;
	isSubsection?: boolean;
	onDelete: () => void;
	onToggleExpand: () => void;
	onUpdate: (updates: Partial<GrantSection>) => void;
	section: GrantSection;
}

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

interface DragAndDropContainerProps {
	activeId: null | string;
	activeSection: GrantSection | undefined;
	expandedSections: Set<string>;
	grantSections: GrantSection[];
	grantTemplateRagJobData?: API.RetrieveRagJob.Http200.ResponseBody | null;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleDragEnd: (event: DragEndEvent) => Promise<void>;
	handleDragOver: (event: DragOverEvent) => Promise<void>;
	handleDragStart: (event: DragStartEvent) => void;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	mainSections: GrantSection[];
	sensors: ReturnType<typeof useSensors>;
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

interface SectionEditFormProps {
	formData: SectionFormData;
	isDragging: boolean;
	isSubsection: boolean;
	onCancel: () => void;
	onSave: () => void;
	section: GrantSection;
	setFormData: (data: SectionFormData) => void;
	setNodeRef: (node: HTMLElement | null) => void;
	style: React.CSSProperties;
}

interface SectionEditorProps {
	activeId: null | string;
	activeSection: GrantSection | undefined;
	expandedSections: Set<string>;
	grantSections: GrantSection[];
	grantTemplateRagJobData?: API.RetrieveRagJob.Http200.ResponseBody | null;
	handleAddNewSection: () => Promise<void>;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleDragEnd: (event: DragEndEvent) => Promise<void>;
	handleDragOver: (event: DragOverEvent) => Promise<void>;
	handleDragStart: (event: DragStartEvent) => void;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	mainSections: GrantSection[];
	sensors: ReturnType<typeof useSensors>;
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

interface SectionListProps {
	expandedSections: Set<string>;
	grantSections: GrantSection[];
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	mainSections: GrantSection[];
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

export function ApplicationStructureStep() {
	const { application, retrieveApplication } = useApplicationStore();
	const { checkTemplateRagJobStatus, grantTemplateRagJobData } = useWizardStore();
	const [visibleSteps, setVisibleSteps] = useState(0);

	const parentId = application?.grant_template?.id;

	const isGeneratingTemplate =
		grantTemplateRagJobData?.status === "PROCESSING" || grantTemplateRagJobData?.status === "PENDING";

	const templateFiles: FileWithId[] = (application?.grant_template?.rag_sources ?? [])
		.filter((source) => source.filename)
		.map((source) => {
			const file = new File([], source.filename!, { type: "application/octet-stream" });
			return Object.assign(file, { id: source.sourceId });
		});

	const templateUrls = (application?.grant_template?.rag_sources ?? [])
		.filter((source) => source.url)
		.map((source) => source.url!);

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
		<div className="flex size-full" data-testid="application-structure-step">
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
															visibleSteps > sectionIndex
																? "text-gray-700"
																: "text-gray-400"
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
									<p
										className="text-muted-foreground-dark text-sm"
										data-testid="no-documents-message"
									>
										No documents uploaded yet.
									</p>
								)}
							</Card>

							{templateUrls.length > 0 && (
								<Card className="border-app-gray-100 border p-4 shadow-none">
									<h3 className="font-heading mb-2 text-base font-semibold">Links</h3>
									<div className="space-y-1">
										{templateUrls.map((url, index) => (
											<LinkPreviewItem
												key={url + index.toString()}
												parentId={parentId}
												url={url}
											/>
										))}
									</div>
								</Card>
							)}
						</div>
					)}
				</div>
			</div>

			<ApplicationStructurePreview />
		</div>
	);
}

function ApplicationStructurePreview() {
	const { application, updateGrantSections } = useApplicationStore();
	const { grantTemplateRagJobData } = useWizardStore();

	const grantSections = application?.grant_template?.grant_sections ?? [];
	const isGeneratingTemplate =
		grantTemplateRagJobData?.status === "PROCESSING" || grantTemplateRagJobData?.status === "PENDING";
	const [activeId, setActiveId] = useState<null | string>(null);
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const toggleSectionExpanded = (sectionId: string) => {
		setExpandedSections((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(sectionId)) {
				newSet.delete(sectionId);
			} else {
				newSet.add(sectionId);
			}
			return newSet;
		});
	};

	const handleUpdateSection = async (sectionId: string, updates: Partial<GrantSection>) => {
		const updatedSections = grantSections.map((section) => {
			if (section.id === sectionId) {
				return toUpdateGrantSection({ ...section, ...updates });
			}
			return toUpdateGrantSection(section);
		});
		await updateGrantSections(updatedSections);
	};

	const handleDeleteSection = async (sectionId: string) => {
		const updatedSections = grantSections.filter((section) => section.id !== sectionId).map(toUpdateGrantSection);
		await updateGrantSections(updatedSections);
		setExpandedSections((prev) => {
			const newSet = new Set(prev);
			newSet.delete(sectionId);
			return newSet;
		});
	};

	const handleAddNewSection = async () => {
		const newSection: UpdateGrantSection = {
			depends_on: [],
			generation_instructions: "",
			id: `new-section-${Date.now()}`,
			is_clinical_trial: null,
			is_detailed_workplan: null,
			keywords: [],
			max_words: 3000,
			order: grantSections.length,
			parent_id: null,
			search_queries: [],
			title: "Category Name",
			topics: [],
		};
		const updatedSections = [...grantSections.map(toUpdateGrantSection), newSection];
		await updateGrantSections(updatedSections);
	};

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over || active.id === over.id) {
			return;
		}

		const sections = [...grantSections];
		const activeSection = sections.find((s) => s.id === active.id);
		const overSection = sections.find((s) => s.id === over.id);

		if (!(activeSection && overSection)) {
			return;
		}

		const oldIndex = sections.findIndex((s) => s.id === active.id);
		const newIndex = sections.findIndex((s) => s.id === over.id);

		const reorderedSections = arrayMove(sections, oldIndex, newIndex);

		const updatedSections = reorderedSections.map((section, index) => ({
			...section,
			order: index,
			parent_id: section.parent_id ?? null,
		}));

		await updateGrantSections(updatedSections as API.UpdateGrantTemplate.RequestBody["grant_sections"]);
	};

	const handleDragOver = async (event: DragOverEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		const sections = [...grantSections];
		const activeSection = sections.find((s) => s.id === active.id);
		const overSection = sections.find((s) => s.id === over.id);

		if (!(activeSection && overSection)) {
			return;
		}

		const activeIsChild = activeSection.parent_id !== null;
		const overIsChild = overSection.parent_id !== null;

		if (activeIsChild !== overIsChild) {
			const updatedSections = sections.map((section) => {
				if (section.id === activeSection.id) {
					return {
						...section,
						parent_id: overIsChild ? overSection.parent_id : null,
					};
				}
				return section;
			});

			await updateGrantSections(updatedSections as API.UpdateGrantTemplate.RequestBody["grant_sections"]);
		}
	};

	const sortedSections = [...grantSections].sort((a, b) => a.order - b.order);
	const mainSections = sortedSections.filter((section) => !section.parent_id);
	const subsectionsByParent = sortedSections.reduce<Record<string, typeof grantSections>>((acc, section) => {
		if (section.parent_id) {
			if (!(section.parent_id in acc)) {
				acc[section.parent_id] = [];
			}
			acc[section.parent_id].push(section);
		}
		return acc;
	}, {});

	const activeSection = grantSections.find((s) => s.id === activeId);

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			{(() => {
				if (!application) {
					return <EmptyStateView />;
				}
				if (isGeneratingTemplate) {
					return <GeneratingLoader />;
				}
				return (
					<SectionEditor
						activeId={activeId}
						activeSection={activeSection}
						expandedSections={expandedSections}
						grantSections={grantSections}
						grantTemplateRagJobData={grantTemplateRagJobData}
						handleAddNewSection={handleAddNewSection}
						handleDeleteSection={handleDeleteSection}
						handleDragEnd={handleDragEnd}
						handleDragOver={handleDragOver}
						handleDragStart={handleDragStart}
						handleUpdateSection={handleUpdateSection}
						mainSections={mainSections}
						sensors={sensors}
						subsectionsByParent={subsectionsByParent}
						toggleSectionExpanded={toggleSectionExpanded}
					/>
				);
			})()}
		</div>
	);
}

function DragAndDropContainer({
	activeId,
	activeSection,
	expandedSections,
	grantSections,
	handleDeleteSection,
	handleDragEnd,
	handleDragOver,
	handleDragStart,
	handleUpdateSection,
	mainSections,
	sensors,
	subsectionsByParent,
	toggleSectionExpanded,
}: DragAndDropContainerProps) {
	return (
		<DndContext
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<div className="space-y-3">
				{grantSections.length > 0 && (
					<SectionList
						expandedSections={expandedSections}
						grantSections={grantSections}
						handleDeleteSection={handleDeleteSection}
						handleUpdateSection={handleUpdateSection}
						mainSections={mainSections}
						subsectionsByParent={subsectionsByParent}
						toggleSectionExpanded={toggleSectionExpanded}
					/>
				)}
			</div>
			<SectionDragOverlay activeId={activeId} activeSection={activeSection} />
		</DndContext>
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

function PreviewHeader({ onAddSection }: { onAddSection: () => void }) {
	return (
		<div className="mb-4 flex justify-end">
			<AppButton
				data-testid="add-new-section-button"
				leftIcon={<Plus />}
				onClick={onAddSection}
				size="sm"
				variant="secondary"
			>
				Add New Section
			</AppButton>
		</div>
	);
}

function SectionDragOverlay({
	activeId,
	activeSection,
}: {
	activeId: null | string;
	activeSection: GrantSection | undefined;
}) {
	return (
		<DragOverlay>
			{activeId && activeSection ? (
				<div className="cursor-move rounded border border-gray-200 bg-white p-3 shadow-lg">
					<div className="flex items-center justify-between">
						<h5 className="font-medium">{activeSection.title}</h5>
						{isDetailedSection(activeSection) && activeSection.max_words ? (
							<span className="text-muted-foreground-dark text-sm">
								{activeSection.max_words.toLocaleString()} Max words
							</span>
						) : null}
					</div>
				</div>
			) : null}
		</DragOverlay>
	);
}

function SectionEditForm({
	formData,
	isDragging,
	isSubsection,
	onCancel,
	onSave,
	section,
	setFormData,
	setNodeRef,
	style,
}: SectionEditFormProps) {
	return (
		<div
			className={`rounded border border-gray-200 p-4 ${isSubsection ? "ml-6" : ""} ${
				isDragging ? "shadow-lg" : ""
			}`}
			ref={setNodeRef}
			style={style}
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h5 className="font-medium">New section</h5>
					<Button onClick={onCancel} size="sm" variant="ghost">
						<ChevronUp className="size-4" />
					</Button>
				</div>

				<div className="space-y-4">
					<div>
						<Label htmlFor={`section-name-${section.id}`}>Section name</Label>
						<Input
							className="mt-1"
							id={`section-name-${section.id}`}
							onChange={(e) => {
								setFormData({ ...formData, title: e.target.value });
							}}
							placeholder="Type a name that encapsulates the essence of this section."
							value={formData.title}
						/>
					</div>

					<div>
						<Label>Words/Characters count</Label>
						<p className="text-muted-foreground text-sm">
							This helps AI generate content that fits the grant&apos;s requirements. Choose if the limit
							applies to words or characters.
						</p>
						<div className="mt-2 flex gap-4">
							<div className="flex-1">
								<Label className="sr-only" htmlFor={`max-count-${section.id}`}>
									Max count
								</Label>
								<Input
									id={`max-count-${section.id}`}
									onChange={(e) => {
										setFormData({
											...formData,
											max_words: Number.parseInt(e.target.value) || 0,
										});
									}}
									placeholder="3,000"
									type="number"
									value={formData.max_words}
								/>
							</div>
							<div className="w-32">
								<select
									className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
									onChange={(e) => {
										setFormData({ ...formData, useWords: e.target.value === "words" });
									}}
									value={formData.useWords ? "words" : "characters"}
								>
									<option value="words">Words</option>
									<option value="characters">Characters</option>
								</select>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							checked={formData.isResearchPlan}
							id={`research-plan-${section.id}`}
							onCheckedChange={(checked) => {
								setFormData({ ...formData, isResearchPlan: checked as boolean });
							}}
						/>
						<Label className="text-sm font-normal" htmlFor={`research-plan-${section.id}`}>
							This is the main Research Plan
						</Label>
					</div>

					<div className="flex justify-between gap-2">
						<Button onClick={onCancel} variant="outline">
							Cancel
						</Button>
						<Button onClick={onSave}>Save</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function SectionEditor({
	activeId,
	activeSection,
	expandedSections,
	grantSections,
	grantTemplateRagJobData,
	handleAddNewSection,
	handleDeleteSection,
	handleDragEnd,
	handleDragOver,
	handleDragStart,
	handleUpdateSection,
	mainSections,
	sensors,
	subsectionsByParent,
	toggleSectionExpanded,
}: SectionEditorProps) {
	return (
		<div className="flex h-full flex-col">
			<PreviewHeader onAddSection={handleAddNewSection} />
			<ScrollArea className="flex-1">
				<div className="space-y-5">
					<Card
						className="border-app-gray-100 border p-5 shadow-none"
						data-testid="application-structure-sections"
					>
						<DragAndDropContainer
							activeId={activeId}
							activeSection={activeSection}
							expandedSections={expandedSections}
							grantSections={grantSections}
							grantTemplateRagJobData={grantTemplateRagJobData}
							handleDeleteSection={handleDeleteSection}
							handleDragEnd={handleDragEnd}
							handleDragOver={handleDragOver}
							handleDragStart={handleDragStart}
							handleUpdateSection={handleUpdateSection}
							mainSections={mainSections}
							sensors={sensors}
							subsectionsByParent={subsectionsByParent}
							toggleSectionExpanded={toggleSectionExpanded}
						/>
					</Card>
				</div>
			</ScrollArea>
		</div>
	);
}

function SectionList({
	expandedSections,
	grantSections,
	handleDeleteSection,
	handleUpdateSection,
	mainSections,
	subsectionsByParent,
	toggleSectionExpanded,
}: SectionListProps) {
	return (
		<SortableContext items={grantSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
			{mainSections.map((section) => (
				<div key={section.id}>
					<SortableSection
						isExpanded={expandedSections.has(section.id)}
						onDelete={() => handleDeleteSection(section.id)}
						onToggleExpand={() => {
							toggleSectionExpanded(section.id);
						}}
						onUpdate={(updates) => handleUpdateSection(section.id, updates)}
						section={section}
					/>
					{(subsectionsByParent[section.id] ?? []).map((subsection) => (
						<SortableSection
							isExpanded={expandedSections.has(subsection.id)}
							isSubsection
							key={subsection.id}
							onDelete={() => handleDeleteSection(subsection.id)}
							onToggleExpand={() => {
								toggleSectionExpanded(subsection.id);
							}}
							onUpdate={(updates) => handleUpdateSection(subsection.id, updates)}
							section={subsection}
						/>
					))}
				</div>
			))}
		</SortableContext>
	);
}

function SortableSection({
	isDragging = false,
	isExpanded,
	isSubsection = false,
	onDelete: _onDelete,
	onToggleExpand,
	onUpdate,
	section,
}: SortableSectionProps) {
	const {
		attributes,
		isDragging: isCurrentlyDragging,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: section.id });

	const [formData, setFormData] = useState<SectionFormData>({
		isResearchPlan: isDetailedSection(section) ? (section.is_detailed_workplan ?? false) : false,
		max_words: isDetailedSection(section) ? section.max_words : 3000,
		title: section.title,
		useWords: true,
	});

	const style = {
		opacity: isCurrentlyDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const hasMaxWords = isDetailedSection(section) && section.max_words;

	const handleSave = () => {
		onUpdate({
			max_words: formData.max_words,
			title: formData.title,
			...(formData.isResearchPlan !== undefined && { is_detailed_workplan: formData.isResearchPlan }),
		});
		onToggleExpand();
	};

	if (isExpanded) {
		return (
			<SectionEditForm
				formData={formData}
				isDragging={isDragging}
				isSubsection={isSubsection}
				onCancel={onToggleExpand}
				onSave={handleSave}
				section={section}
				setFormData={setFormData}
				setNodeRef={setNodeRef}
				style={style}
			/>
		);
	}

	return (
		<div
			className={`flex w-full items-center justify-start gap-6 rounded bg-white px-3 py-4 outline outline-1 outline-offset-[-1px] outline-blue-500 ${isSubsection ? "ml-6" : ""} ${
				isDragging ? "shadow-lg" : ""
			}`}
			ref={setNodeRef}
			style={style}
		>
			<div {...attributes} {...listeners} className="relative size-6 cursor-move">
				<GripVertical className="size-6 text-gray-400" />
			</div>

			<div className="flex flex-1 items-center justify-between gap-2">
				<div className="flex flex-1 flex-col items-start justify-start gap-1">
					<div className="flex w-full items-center justify-start gap-2">
						<h3 className="text-base font-medium text-gray-900">{section.title}</h3>
						{hasMaxWords && isDetailedSection(section) && (
							<span className="text-sm font-normal text-gray-500">
								{section.max_words.toLocaleString()} Max words
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end gap-2">
					<Button
						className="opacity-0 transition-opacity hover:opacity-100"
						onClick={_onDelete}
						size="icon"
						type="button"
						variant="ghost"
					>
						<Image
							alt="Delete"
							className="size-4 text-red-500"
							height={16}
							src="/icons/delete.svg"
							width={16}
						/>
					</Button>

					{!isSubsection && (
						<Button
							className="opacity-0 transition-opacity hover:opacity-100"
							size="icon"
							type="button"
							variant="ghost"
						>
							<Plus className="size-4 text-blue-500" />
						</Button>
					)}

					{/* Expand/Collapse Arrow */}
					<Button onClick={onToggleExpand} size="icon" type="button" variant="ghost">
						<ChevronDown className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
