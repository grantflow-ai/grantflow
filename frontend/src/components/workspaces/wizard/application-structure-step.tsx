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
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconApplication, IconPreviewLogo } from "@/components/workspaces/icons";
import { ThemeBadge } from "@/components/workspaces/theme-badge";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";

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

interface ApplicationStructurePreviewProps {
	connectionStatus?: string;
	connectionStatusColor?: string;
}

interface ApplicationStructureStepProps {
	connectionStatus?: string;
	connectionStatusColor?: string;
}

interface SortableSectionProps {
	isDragging?: boolean;
	isExpanded: boolean;
	isSubsection?: boolean;
	onDelete: () => void;
	onToggleExpand: () => void;
	onUpdate: (updates: Partial<GrantSection>) => void;
	section: GrantSection;
}

export function ApplicationStructureStep({ connectionStatus, connectionStatusColor }: ApplicationStructureStepProps) {
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
							{structureAnalysisStatus === "analyzing"
								? "Analyzing your knowledge base to generate the optimal structure..."
								: "Review and customize the structure of your grant application."}
						</p>
					</div>

					{structureAnalysisStatus === "analyzing" ? (
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
										{/* Step connector line */}
										{sectionIndex < ANALYZING_STEPS.length - 1 && (
											<div
												className={`absolute left-3 top-8 h-full w-0.5 transition-all duration-500 ${
													visibleSteps > sectionIndex ? "bg-blue-200" : "bg-gray-200"
												}`}
											/>
										)}

										{/* Step header */}
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

										{/* Sub-steps */}
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
					) : structureAnalysisStatus === "analyzed" ? (
						<AnalyzedStateContent />
					) : (
						<div className="space-y-4">
							<Card className="border-app-gray-100 border p-4 shadow-none">
								<h3 className="font-heading mb-2 text-base font-semibold">Section Configuration</h3>
								<p className="text-muted-foreground-dark text-sm">
									Configure the sections and structure of your application based on the requirements.
								</p>
							</Card>

							<Card className="border-app-gray-100 border p-4 shadow-none">
								<h3 className="font-heading mb-2 text-base font-semibold">Content Organization</h3>
								<p className="text-muted-foreground-dark text-sm">
									Organize your content and determine the flow of your application.
								</p>
							</Card>

							<Card className="border-app-gray-100 border p-4 shadow-none">
								<h3 className="font-heading mb-2 text-base font-semibold">Requirements Mapping</h3>
								<p className="text-muted-foreground-dark text-sm">
									Map application requirements to specific sections and content areas.
								</p>
							</Card>
						</div>
					)}
				</div>
			</div>

			<ApplicationStructurePreview
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
			/>
		</div>
	);
}

function ApplicationStructurePreview({ connectionStatus, connectionStatusColor }: ApplicationStructurePreviewProps) {
	const { application, applicationTitle, updateGrantSections } = useApplicationStore();
	const hasContent = applicationTitle || application;
	const grantSections = application?.grant_template?.grant_sections ?? [];
	const [activeId, setActiveId] = useState<null | string>(null);
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
	const [editingNewSection, setEditingNewSection] = useState(false);

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

	const handleAddNewSection = async (sectionData: SectionFormData) => {
		const newSection: UpdateGrantSection = {
			depends_on: [],
			generation_instructions: "",
			id: `new-section-${Date.now()}`,
			is_clinical_trial: null,
			is_detailed_workplan: sectionData.isResearchPlan ? true : null,
			keywords: [],
			max_words: sectionData.max_words,
			order: grantSections.length,
			parent_id: null,
			search_queries: [],
			title: sectionData.title,
			topics: [],
		};
		const updatedSections = [...grantSections.map(toUpdateGrantSection), newSection];
		await updateGrantSections(updatedSections);
		setEditingNewSection(false);
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
			{hasContent ? (
				<>
					<div className="mb-11 flex flex-col items-start gap-2">
						<div className="flex items-center gap-2">
							<ThemeBadge color="light" leftIcon={<IconApplication />}>
								Application Structure
							</ThemeBadge>
							{connectionStatus && (
								<ThemeBadge className={`w-fit ${connectionStatusColor} text-white`}>
									{connectionStatus}
								</ThemeBadge>
							)}
						</div>
						<h3
							className="font-heading text-center text-3xl font-medium"
							data-testid="application-structure-title"
						>
							{applicationTitle.trim() || "Untitled Application"}
						</h3>
					</div>

					<ScrollArea className="flex-1">
						<div className="space-y-5">
							<Card
								className="border-app-gray-100 border p-5 shadow-none"
								data-testid="application-structure-sections"
							>
								<div className="mb-4 flex items-center justify-between">
									<h4 className="font-heading font-semibold">Application Sections</h4>
									<Button
										className="gap-2"
										onClick={() => {
											setEditingNewSection(true);
										}}
										size="sm"
										variant="outline"
									>
										<Plus className="size-4" />
										Add New Section
									</Button>
								</div>
								{editingNewSection && (
									<NewSectionForm
										onCancel={() => {
											setEditingNewSection(false);
										}}
										onSave={handleAddNewSection}
									/>
								)}
								<DndContext
									collisionDetection={closestCenter}
									onDragEnd={handleDragEnd}
									onDragOver={handleDragOver}
									onDragStart={handleDragStart}
									sensors={sensors}
								>
									<div className="space-y-3">
										{grantSections.length > 0 ? (
											<SortableContext
												items={grantSections.map((s) => s.id)}
												strategy={verticalListSortingStrategy}
											>
												{mainSections.map((section) => (
													<div key={section.id}>
														<SortableSection
															isExpanded={expandedSections.has(section.id)}
															onDelete={() => handleDeleteSection(section.id)}
															onToggleExpand={() => {
																toggleSectionExpanded(section.id);
															}}
															onUpdate={(updates) =>
																handleUpdateSection(section.id, updates)
															}
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
																onUpdate={(updates) =>
																	handleUpdateSection(subsection.id, updates)
																}
																section={subsection}
															/>
														))}
													</div>
												))}
											</SortableContext>
										) : (
											<>
												<div className="rounded border border-gray-200 p-3">
													<h5 className="font-medium">Executive Summary</h5>
													<p className="text-muted-foreground-dark text-sm">
														Overview of the project and key highlights
													</p>
												</div>
												<div className="rounded border border-gray-200 p-3">
													<h5 className="font-medium">Project Description</h5>
													<p className="text-muted-foreground-dark text-sm">
														Detailed description of the proposed project
													</p>
												</div>
												<div className="rounded border border-gray-200 p-3">
													<h5 className="font-medium">Budget & Timeline</h5>
													<p className="text-muted-foreground-dark text-sm">
														Financial breakdown and project timeline
													</p>
												</div>
												<div className="rounded border border-gray-200 p-3">
													<h5 className="font-medium">Team & Qualifications</h5>
													<p className="text-muted-foreground-dark text-sm">
														Team members and their relevant experience
													</p>
												</div>
											</>
										)}
									</div>
									<DragOverlay>
										{activeId && activeSection ? (
											<div className="cursor-move rounded border border-gray-200 bg-white p-3 shadow-lg">
												<div className="flex items-center justify-between">
													<h5 className="font-medium">{activeSection.title}</h5>
													{isDetailedSection(activeSection) && activeSection.max_words && (
														<span className="text-muted-foreground-dark text-sm">
															{activeSection.max_words.toLocaleString()} Max words
														</span>
													)}
												</div>
											</div>
										) : null}
									</DragOverlay>
								</DndContext>
							</Card>
						</div>
					</ScrollArea>
				</>
			) : (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
					<p className="text-muted-foreground-dark mt-6 text-center text-sm">
						Configure your application structure to see a preview
					</p>
				</div>
			)}
		</div>
	);
}

function NewSectionForm({ onCancel, onSave }: { onCancel: () => void; onSave: (data: SectionFormData) => void }) {
	const [formData, setFormData] = useState<SectionFormData>({
		isResearchPlan: false,
		max_words: 3000,
		title: "",
		useWords: true,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.title.trim()) {
			onSave(formData);
		}
	};

	return (
		<form className="mb-4 space-y-4 rounded border border-gray-200 p-4" onSubmit={handleSubmit}>
			<div className="flex items-center justify-between">
				<h5 className="font-medium">New section</h5>
			</div>

			<div className="space-y-4">
				<div>
					<Label htmlFor="new-section-name">Section name</Label>
					<Input
						className="mt-1"
						id="new-section-name"
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
							<Label className="sr-only" htmlFor="new-max-count">
								Max count
							</Label>
							<Input
								id="new-max-count"
								onChange={(e) => {
									setFormData({ ...formData, max_words: Number.parseInt(e.target.value) || 0 });
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
						id="new-research-plan"
						onCheckedChange={(checked) => {
							setFormData({ ...formData, isResearchPlan: checked as boolean });
						}}
					/>
					<Label className="text-sm font-normal" htmlFor="new-research-plan">
						This is the main Research Plan
					</Label>
				</div>

				<div className="flex justify-between gap-2">
					<Button onClick={onCancel} type="button" variant="outline">
						Cancel
					</Button>
					<Button disabled={!formData.title.trim()} type="submit">
						Save
					</Button>
				</div>
			</div>
		</form>
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
						<Button onClick={onToggleExpand} size="sm" variant="ghost">
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
								This helps AI generate content that fits the grant&apos;s requirements. Choose if the
								limit applies to words or characters.
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
							<Button onClick={onToggleExpand} variant="outline">
								Cancel
							</Button>
							<Button onClick={handleSave}>Save</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`rounded border border-gray-200 p-3 ${isSubsection ? "ml-6" : ""} ${
				isDragging ? "shadow-lg" : ""
			}`}
			ref={setNodeRef}
			style={style}
		>
			<div className="flex items-center gap-2">
				<div {...attributes} {...listeners} className="cursor-move">
					<GripVertical className="size-4 text-gray-400" />
				</div>
				<div className="flex flex-1 items-center justify-between">
					<h5 className="font-medium">{section.title}</h5>
					<div className="flex items-center gap-2">
						{hasMaxWords && isDetailedSection(section) && (
							<span className="text-muted-foreground-dark text-sm">
								{section.max_words.toLocaleString()} Max words
							</span>
						)}
						<Button onClick={onToggleExpand} size="sm" variant="ghost">
							<ChevronDown className="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}