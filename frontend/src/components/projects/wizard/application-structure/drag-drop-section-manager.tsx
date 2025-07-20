"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type DragDropHandlers,
	useDragAndDrop,
} from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger";
import { SortableSection } from "./grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionListProps {
	expandedSectionId: null | string;
	handleAddNewSection: (parentId?: null | string) => Promise<void>;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleUpdateSection: (
		sectionId: string,
		updates: Partial<GrantSection>,
	) => Promise<void>;
	isDetailedSection: (section: GrantSection) => boolean;
	mainSections: GrantSection[];
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

export function DragDropSectionManager({
	isDetailedSection,
	onAddSection,
}: {
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
}) {
	const application = useApplicationStore((state) => state.application);
	const updateGrantSections = useApplicationStore(
		(state) => state.updateGrantSections,
	);
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(
		null,
	);
	const [pendingParentChange, setPendingParentChange] = useState<{
		newParentId: null | string;
		sectionId: string;
	} | null>(null);

	const grantSections = application?.grant_template?.grant_sections ?? [];

	const toUpdateGrantSection = useCallback(
		(section: GrantSection): UpdateGrantSection => {
			if (isDetailedSection(section)) {
				return section as UpdateGrantSection;
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
		},
		[isDetailedSection],
	);

	const wouldCreateInvalidNesting = useCallback(
		(activeSection: GrantSection, overSection: GrantSection) => {
			if (overSection.parent_id !== null && activeSection.parent_id === null) {
				const hasChildren = grantSections.some(
					(section) => section.parent_id === activeSection.id,
				);
				if (hasChildren) {
					return true;
				}
			}

			return false;
		},
		[grantSections],
	);

	const determineNewParentId = useCallback(
		(activeSection: GrantSection, overSection: GrantSection) => {
			const activeIsChild = activeSection.parent_id !== null;
			const overIsChild = overSection.parent_id !== null;

			if (overIsChild) {
				return overSection.parent_id;
			}

			if (activeIsChild) {
				return overSection.id;
			}

			return null;
		},
		[],
	);

	const toggleSectionExpanded = useCallback((sectionId: string) => {
		setExpandedSectionId((prev) => {
			if (prev === sectionId) {
				return null;
			}
			return sectionId;
		});
	}, []);

	const handleUpdateSection = useCallback(
		async (sectionId: string, updates: Partial<GrantSection>) => {
			const updatedSections = grantSections.map((section) => {
				if (section.id === sectionId) {
					return toUpdateGrantSection({ ...section, ...updates });
				}
				return toUpdateGrantSection(section);
			});
			await updateGrantSections(updatedSections);
		},
		[grantSections, updateGrantSections, toUpdateGrantSection],
	);

	const handleDeleteSection = useCallback(
		async (sectionId: string) => {
			const updatedSections = grantSections
				.filter((section) => section.id !== sectionId)
				.map(toUpdateGrantSection);
			await updateGrantSections(updatedSections);
			setExpandedSectionId((prev) => (prev === sectionId ? null : prev));
		},
		[grantSections, updateGrantSections, toUpdateGrantSection],
	);

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const dragHandlers: DragDropHandlers<GrantSection> = useMemo(
		() => ({
			onDragEnd: async (event, activeItem, overItem) => {
				log.info("Drag ended", {
					activeId: activeItem?.id,
					activeTitle: activeItem?.title,
					eventActive: event.active.id,
					eventOver: event.over?.id,
					overId: overItem?.id,
					overTitle: overItem?.title,
				});

				// Apply pending parent changes if any
				if (pendingParentChange) {
					const updatedSections = grantSections.map((section) => {
						if (section.id === pendingParentChange.sectionId) {
							return toUpdateGrantSection({
								...section,
								parent_id: pendingParentChange.newParentId,
							});
						}
						return toUpdateGrantSection(section);
					});

					log.info("Drag end: Applying pending parent change", {
						newParentId: pendingParentChange.newParentId,
						sectionCount: updatedSections.length,
						sectionId: pendingParentChange.sectionId,
					});
					
					await updateGrantSections(updatedSections);
					setPendingParentChange(null);
				}
			},
			onDragOver: (_event, activeSection, overSection) => {
				if (!(activeSection && overSection)) {
					// log.warn("Drag over: Missing active or over section");
					return;
				}

				if (wouldCreateInvalidNesting(activeSection, overSection)) {
					log.warn("Drag over: Would create invalid nesting", {
						activeId: activeSection.id,
						overId: overSection.id,
					});
					toast.error("Cannot create more than 2 levels of nesting");
					return;
				}

				const newParentId = determineNewParentId(activeSection, overSection);
				log.info("Drag over: Determined new parent", {
					activeId: activeSection.id,
					newParentId,
					oldParentId: activeSection.parent_id,
				});

				// Store pending change but don't apply it yet
				if (activeSection.parent_id !== newParentId) {
					setPendingParentChange({
						newParentId,
						sectionId: activeSection.id,
					});
					log.info("Drag over: Stored pending parent change", {
						newParentId,
						sectionId: activeSection.id,
					});
				}
			},
			onDragStart: (_event, item) => {
				log.info("Drag started", {
					sectionId: item?.id,
					sectionTitle: item?.title,
				});
				// Close any expanded section when dragging starts
				setExpandedSectionId(null);
				// Clear any pending parent changes when starting a new drag
				setPendingParentChange(null);
			},
			onReorder: async (sections, oldIndex, newIndex) => {
				log.info("Reordering sections", {
					newIndex,
					oldIndex,
					sectionCount: sections.length,
				});

				const reorderedSections = arrayMove(sections, oldIndex, newIndex);

				const updatedSections = reorderedSections.map((section, index) => ({
					...section,
					order: index,
					parent_id: section.parent_id ?? null,
				}));

				log.info("Reorder: Updating grant sections", {
					sections: updatedSections.map((s) => ({
						id: s.id,
						order: s.order,
						title: s.title,
					})),
					updatedCount: updatedSections.length,
				});
				await updateGrantSections(updatedSections.map(toUpdateGrantSection));
			},
		}),
		[
			grantSections,
			updateGrantSections,
			toUpdateGrantSection,
			wouldCreateInvalidNesting,
			determineNewParentId,
			pendingParentChange,
		],
	);

	const { DragDropWrapper } = useDragAndDrop<GrantSection>(dragHandlers);

	const sortedSections = useMemo(
		() => [...grantSections].sort((a, b) => a.order - b.order),
		[grantSections],
	);

	const mainSections = useMemo(
		() => sortedSections.filter((section) => !section.parent_id),
		[sortedSections],
	);

	const subsectionsByParent = useMemo(
		() =>
			sortedSections.reduce<Record<string, typeof grantSections>>(
				(acc, section) => {
					if (section.parent_id) {
						if (!(section.parent_id in acc)) {
							acc[section.parent_id] = [];
						}
						acc[section.parent_id].push(section);
					}
					return acc;
				},
				{},
			),
		[sortedSections],
	);

	const renderDragOverlay = useCallback(
		(activeSection: GrantSection | undefined) => {
			if (!activeSection) return null;

			return <SectionDragOverlay activeSection={activeSection} />;
		},
		[],
	);

	return (
		<DragDropWrapper
			items={grantSections}
			renderDragOverlay={renderDragOverlay}
		>
			<div className="mb-3 space-y-2 p-1">
				{grantSections.length > 0 && (
					<SectionList
						expandedSectionId={expandedSectionId}
						handleAddNewSection={handleAddNewSection}
						handleDeleteSection={handleDeleteSection}
						handleUpdateSection={handleUpdateSection}
						isDetailedSection={isDetailedSection}
						mainSections={mainSections}
						subsectionsByParent={subsectionsByParent}
						toggleSectionExpanded={toggleSectionExpanded}
						toUpdateGrantSection={toUpdateGrantSection}
					/>
				)}
			</div>
		</DragDropWrapper>
	);
}

function SectionDragOverlay({
	activeSection,
}: {
	activeSection: GrantSection;
}) {
	const isSubsection = activeSection.parent_id !== null;
	const hasMaxWords =
		"max_words" in activeSection && Boolean(activeSection.max_words);

	return (
		<div
			className={`group rounded outline-2 outline-offset-[-1px] outline-primary transition-all duration-200 bg-white shadow-xl ${isSubsection ? "ml-[6.875rem] px-3 py-2" : "px-3 py-4"}`}
			style={{ minWidth: isSubsection ? "410px" : "300px" }}
		>
			<div
				className={`flex items-center justify-start ${isSubsection ? "gap-2" : "gap-5"}`}
			>
				<div className="relative size-6 cursor-grabbing">
					<GripVertical className="size-6 text-gray-400" />
				</div>

				<div className="flex flex-1 items-center justify-between">
					<div className="flex flex-1 flex-col items-start justify-start">
						<div className="flex w-full items-center justify-start gap-1.5">
							<h3
								className={`${isSubsection ? "font-normal leading-tight" : "font-heading leading-snug"} text-base font-semibold text-app-black`}
							>
								{activeSection.title}
							</h3>
							{hasMaxWords && "max_words" in activeSection && (
								<span className="text-xs font-normal leading-none text-dark-gray">
									{activeSection.max_words.toLocaleString()} Max words
								</span>
							)}
						</div>
					</div>
					<div className="flex items-center justify-end">
						<SectionIconButton className="size-7 opacity-100">
							<Image
								alt="Delete"
								height={24}
								src="/icons/delete.svg"
								width={24}
							/>
						</SectionIconButton>

						{!isSubsection && (
							<SectionIconButton className="ml-1 opacity-100">
								<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
							</SectionIconButton>
						)}

						<SectionIconButton className="ml-5">
							<Image
								alt="Collapse"
								className="transition-transform duration-200"
								height={22}
								src="/icons/chevron-down.svg"
								width={22}
							/>
						</SectionIconButton>
					</div>
				</div>
			</div>
		</div>
	);
}

function SectionList({
	expandedSectionId,
	handleAddNewSection,
	handleDeleteSection,
	handleUpdateSection,
	isDetailedSection,
	mainSections,
	subsectionsByParent,
	toggleSectionExpanded,
	toUpdateGrantSection,
}: {
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
} & SectionListProps) {
	return (
		<>
			{mainSections.map((section) => (
				<div className="space-y-2" key={section.id}>
					<SortableSection
						isDetailedSection={isDetailedSection}
						isExpanded={expandedSectionId === section.id}
						onAddSubsection={() => handleAddNewSection(section.id)}
						onDelete={() => handleDeleteSection(section.id)}
						onToggleExpand={() => {
							toggleSectionExpanded(section.id);
						}}
						onUpdate={(updates) => handleUpdateSection(section.id, updates)}
						section={section}
						toUpdateGrantSection={toUpdateGrantSection}
					/>
					{(subsectionsByParent[section.id] ?? []).map((subsection) => (
						<SortableSection
							isDetailedSection={isDetailedSection}
							isExpanded={expandedSectionId === subsection.id}
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
							toUpdateGrantSection={toUpdateGrantSection}
						/>
					))}
				</div>
			))}
		</>
	);
}
