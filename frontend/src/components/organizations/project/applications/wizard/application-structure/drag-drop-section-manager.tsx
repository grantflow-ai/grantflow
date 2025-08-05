"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { type DragDropHandlers, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { hasDetailedResearchPlan, hasDetailedResearchPlanUpdate } from "@/types/grant-sections";
import { log } from "@/utils/logger";
import { SortableSection } from "./grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionListProps {
	expandedSectionId: null | string;
	handleAddNewSection: (parentId?: null | string) => Promise<void>;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	isDetailedSection: (section: GrantSection) => boolean;
	mainSections: GrantSection[];
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

import type { RefObject } from "react";
import { AppButton } from "@/components/app";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/shared/wizard-dialog";

export function DragDropSectionManager({
	dialogRef,
	isDetailedSection,
	onAddSection,
}: {
	dialogRef: RefObject<null | WizardDialogRef>;
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
}) {
	const application = useApplicationStore((state) => state.application);
	const updateGrantSections = useApplicationStore((state) => state.updateGrantSections);
	const grantSections = application?.grant_template?.grant_sections ?? [];
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(null);
	const [pendingParentChange, setPendingParentChange] = useState<{
		newParentId: null | string;
		sectionId: string;
	} | null>(null);

	const wouldCreateInvalidNesting = useCallback(
		(activeSection: GrantSection, overSection: GrantSection) => {
			log.info("wouldCreateInvalidNesting check", {
				activeId: activeSection.id,
				activeParentId: activeSection.parent_id,
				overId: overSection.id,
				overParentId: overSection.parent_id,
			});

			if (overSection.parent_id !== null && activeSection.parent_id === null) {
				const hasChildren = grantSections.some((section) => section.parent_id === activeSection.id);
				log.info("Main section over sub-section check", {
					activeId: activeSection.id,
					hasChildren,
					wouldBeInvalid: hasChildren,
				});
				if (hasChildren) {
					return true;
				}
			}

			return false;
		},
		[grantSections],
	);

	const determineNewParentId = useCallback((activeSection: GrantSection, overSection: GrantSection) => {
		const activeIsChild = activeSection.parent_id !== null;
		const overIsChild = overSection.parent_id !== null;

		if (overIsChild) {
			return overSection.parent_id;
		}

		if (activeIsChild) {
			return overSection.id;
		}

		return null;
	}, []);

	const toggleSectionExpanded = useCallback((sectionId: string) => {
		setExpandedSectionId((prev) => {
			if (prev === sectionId) {
				return null;
			}
			return sectionId;
		});
	}, []);

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

	const handleUpdateSection = useCallback(
		async (sectionId: string, updates: Partial<GrantSection>) => {
			const isBecomingResearchPlan =
				hasDetailedResearchPlanUpdate(updates) && updates.is_detailed_research_plan === true;

			const updatedSections = grantSections.map((section) => {
				if (section.id === sectionId) {
					return toUpdateGrantSection({ ...section, ...updates });
				}
				if (isBecomingResearchPlan && hasDetailedResearchPlan(section)) {
					return toUpdateGrantSection({ ...section, is_detailed_research_plan: false });
				}
				return toUpdateGrantSection(section);
			});
			await useApplicationStore.getState().updateGrantSections(updatedSections);
		},
		[grantSections, toUpdateGrantSection],
	);

	const performDelete = useCallback(
		async (sectionId: string) => {
			const sectionToDelete = grantSections.find((section) => section.id === sectionId);
			if (!sectionToDelete) return;

			const sectionsToDelete = [sectionId];
			if (sectionToDelete.parent_id === null) {
				const subSections = grantSections.filter((section) => section.parent_id === sectionId);
				sectionsToDelete.push(...subSections.map((section) => section.id));
			}

			const updatedSections = grantSections
				.filter((section) => !sectionsToDelete.includes(section.id))
				.map(toUpdateGrantSection);
			await useApplicationStore.getState().updateGrantSections(updatedSections);
			setExpandedSectionId((prev) => (prev === sectionId ? null : prev));
		},
		[grantSections, toUpdateGrantSection],
	);

	const showDeleteConfirmation = useCallback(
		(sectionId: string) => {
			const section = grantSections.find((s) => s.id === sectionId);
			if (!section) return;

			const subSections = grantSections.filter((s) => s.parent_id === sectionId);
			const hasSubSections = subSections.length > 0;

			dialogRef.current?.open({
				content: null,
				description: hasSubSections
					? "All content within this section and its sub-sections will be permanently removed. This action cannot be undone."
					: "All content within this section will be permanently removed. This action cannot be undone.",
				dismissOnOutsideClick: false,
				footer: (
					<div className="flex justify-between w-full">
						<AppButton
							data-testid="cancel-delete-button"
							onClick={() => dialogRef.current?.close()}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							data-testid="confirm-delete-button"
							onClick={async () => {
								await performDelete(sectionId);
								dialogRef.current?.close();
							}}
							variant="primary"
						>
							Delete Section
						</AppButton>
					</div>
				),
				minWidth: "min-w-xl",
				title: "Are you sure you want to delete this section?",
			});
		},
		[grantSections, dialogRef, performDelete],
	);

	const handleDeleteSection = useCallback(
		async (sectionId: string) => {
			const section = grantSections.find((s) => s.id === sectionId);
			if (section?.parent_id) {
				await performDelete(sectionId);
				return;
			}
			showDeleteConfirmation(sectionId);
		},
		[showDeleteConfirmation, performDelete, grantSections],
	);

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const reorderSectionsHierarchically = useCallback(
		async (
			activeSection: GrantSection,
			overSection: GrantSection,
			newParentId: null | string,
			oldIndex: number,
			newIndex: number,
		) => {
			const reorderedSections = arrayMove(grantSections, oldIndex, newIndex);

			const updatedSections = reorderedSections.map((section, index) => ({
				...section,
				order: index,
				parent_id: section.id === activeSection.id ? newParentId : section.parent_id,
			}));

			log.info("Cross-parent reorder complete", {
				activeId: activeSection.id,
				newIndex,
				newParentId,
				oldIndex,
				overId: overSection.id,
			});

			await useApplicationStore.getState().updateGrantSections(updatedSections.map(toUpdateGrantSection));
		},
		[grantSections, toUpdateGrantSection],
	);

	const dragHandlers: DragDropHandlers<GrantSection> = useMemo(
		() => ({
			onDragEnd: (_event) => {
				if (pendingParentChange) {
					setPendingParentChange(null);
				}
			},
			onDragStart: (_event) => {
				if (expandedSectionId !== null) {
					setExpandedSectionId(null);
				}
			},
			onReorder: async (sections, oldIndex, newIndex, activeItem, overItem) => {
				if (activeItem.id === overItem.id) {
					return;
				}

				if (wouldCreateInvalidNesting(activeItem, overItem)) {
					log.info("Main section with children being moved - showing confirmation dialog");

					const handleConfirmMove = async () => {
						dialogRef.current?.close();

						const sectionsWithoutSubs = sections.filter((section) => section.parent_id !== activeItem.id);

						const newOldIndex = sectionsWithoutSubs.findIndex((s) => s.id === activeItem.id);
						const newNewIndex = sectionsWithoutSubs.findIndex((s) => s.id === overItem.id);

						if (newOldIndex !== -1 && newNewIndex !== -1) {
							const reorderedSections = arrayMove(sectionsWithoutSubs, newOldIndex, newNewIndex);
							const updatedSections = reorderedSections.map((section, index) => ({
								...section,
								order: index,
								parent_id:
									section.id === activeItem.id && overItem.parent_id !== null
										? overItem.parent_id
										: section.parent_id,
							}));

							await useApplicationStore
								.getState()
								.updateGrantSections(updatedSections.map(toUpdateGrantSection));
						}
					};

					dialogRef.current?.open({
						content: null,
						description:
							"This section contains sub-sections. Moving it will permanently delete all sub-sections and only keep the main section. This action cannot be undone.",
						dismissOnOutsideClick: false,
						footer: (
							<div className="flex justify-between w-full">
								<AppButton
									data-testid="cancel-move-button"
									onClick={() => dialogRef.current?.close()}
									variant="secondary"
								>
									Cancel
								</AppButton>
								<AppButton
									data-testid="confirm-move-button"
									onClick={handleConfirmMove}
									variant="primary"
								>
									Convert and Remove
								</AppButton>
							</div>
						),
						minWidth: "min-w-xl",
						title: "Move section and delete sub-sections?",
					});
					return;
				}

				const newParentId = determineNewParentId(activeItem, overItem);
				const hasParentChanged = activeItem.parent_id !== newParentId;

				if (hasParentChanged) {
					log.info("Cross-parent reorder detected", {
						activeId: activeItem.id,
						currentParentId: activeItem.parent_id,
						newParentId,
						overId: overItem.id,
					});
					await reorderSectionsHierarchically(activeItem, overItem, newParentId, oldIndex, newIndex);
				} else {
					// Check if active main section has sub-sections
					const activeHasSubSections =
						activeItem.parent_id === null &&
						sections.some((section) => section.parent_id === activeItem.id);

					let reorderedSections: GrantSection[];

					if (activeHasSubSections) {
						log.info("Main section with sub-sections being reordered as group", {
							activeId: activeItem.id,
							overId: overItem.id,
							subSectionsCount: sections.filter((s) => s.parent_id === activeItem.id).length,
						});

						reorderedSections = moveMainSectionWithSubSections(
							sections,
							activeItem.id,
							overItem.id,
							overItem,
						);
					} else {
						// For main-to-main reorder, adjust index if target has sub-sections
						const adjustedNewIndex =
							activeItem.parent_id === null && overItem.parent_id === null
								? getAdjustedIndexForMainSectionReorder(sections, overItem.id, newIndex)
								: newIndex;

						log.info("Same-parent reorder detected", {
							activeId: activeItem.id,
							newIndex: adjustedNewIndex,
							oldIndex,
							overId: overItem.id,
							parentId: activeItem.parent_id,
						});
						reorderedSections = arrayMove(sections, oldIndex, adjustedNewIndex);
					}

					const updatedSections = reorderedSections.map((section, index) => ({
						...section,
						order: index,
						parent_id: section.parent_id ?? null,
					}));

					await useApplicationStore.getState().updateGrantSections(updatedSections.map(toUpdateGrantSection));
				}
			},
		}),
		[
			toUpdateGrantSection,
			wouldCreateInvalidNesting,
			determineNewParentId,
			pendingParentChange,
			expandedSectionId,
			handleUpdateSection,
			grantSections,
			updateGrantSections,
			reorderSectionsHierarchically,
			dialogRef,
		],
	);

	const { DragDropWrapper } = useDragAndDrop<GrantSection>(dragHandlers);

	const sortedSections = useMemo(() => [...grantSections].sort((a, b) => a.order - b.order), [grantSections]);

	const mainSections = useMemo(() => sortedSections.filter((section) => !section.parent_id), [sortedSections]);

	const subsectionsByParent = useMemo(
		() =>
			sortedSections.reduce<Record<string, typeof grantSections>>((acc, section) => {
				if (section.parent_id) {
					if (!(section.parent_id in acc)) {
						acc[section.parent_id] = [];
					}
					acc[section.parent_id].push(section);
				}
				return acc;
			}, {}),
		[sortedSections],
	);

	const renderDragOverlay = useCallback((activeSection: GrantSection | undefined) => {
		if (!activeSection) return null;

		return <SectionDragOverlay activeSection={activeSection} />;
	}, []);

	return (
		<DragDropWrapper items={grantSections} renderDragOverlay={renderDragOverlay}>
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

function getAdjustedIndexForMainSectionReorder(
	sections: GrantSection[],
	overItemId: string,
	originalIndex: number,
): number {
	const lastSubSectionIndex = sections.findLastIndex((section) => section.parent_id === overItemId);
	return lastSubSectionIndex === -1 ? originalIndex : lastSubSectionIndex + 1;
}

function moveMainSectionWithSubSections(
	sections: GrantSection[],
	activeMainSectionId: string,
	overItemId: string,
	overItem: GrantSection,
): GrantSection[] {
	const sectionsToMove = sections.filter(
		(section) => section.id === activeMainSectionId || section.parent_id === activeMainSectionId,
	);

	const remainingSections = sections.filter(
		(section) => section.id !== activeMainSectionId && section.parent_id !== activeMainSectionId,
	);

	if (overItem.parent_id !== null) {
		log.error("Invalid operation: Cannot drop main section with sub-sections over a sub-section", {
			activeMainSectionId,
			overItemId,
			overItemParentId: overItem.parent_id,
		});
		return sections;
	}

	const insertionIndex = getAdjustedIndexForMainSectionReorder(
		remainingSections,
		overItemId,
		remainingSections.findIndex((s) => s.id === overItemId),
	);

	return [
		...remainingSections.slice(0, insertionIndex),
		...sectionsToMove,
		...remainingSections.slice(insertionIndex),
	];
}

function SectionDragOverlay({ activeSection }: { activeSection: GrantSection }) {
	const isSubsection = activeSection.parent_id !== null;
	const hasMaxWords = "max_words" in activeSection && Boolean(activeSection.max_words);

	return (
		<div
			className={`group rounded outline-2 outline-offset-[-1px] outline-primary transition-all duration-200 bg-white shadow-xl ${isSubsection ? "ml-[6.875rem] px-3 py-2" : "px-3 py-4"}`}
			style={{ minWidth: isSubsection ? "410px" : "300px" }}
		>
			<div className={`flex items-center justify-start ${isSubsection ? "gap-2" : "gap-5"}`}>
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
							<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
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
							onUpdate={(updates) => handleUpdateSection(subsection.id, updates)}
							section={subsection}
							toUpdateGrantSection={toUpdateGrantSection}
						/>
					))}
				</div>
			))}
		</>
	);
}
