"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, Plus } from "lucide-react";
import Image from "next/image";
import type { RefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApplicationStore } from "@/stores/application-store";
import { useDragOverlayStore } from "@/stores/drag-overlay-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { hasDetailedResearchPlan, hasDetailedResearchPlanUpdate } from "@/types/grant-sections";
import {
	assignOrderAndParent,
	determineNewParentId,
	executeMainToSubConversion,
	getTargetIndexForMainSectionReorder,
	hasSubSections,
	reorderMainWhenOverMainHasSubSections,
	updateBackendWithReorderedSections,
	updateReorder,
} from "@/utils/grant-sections";
import { log } from "@/utils/logger/client";
import { DragDropContext, type ZoneType } from "./drag-drop-context";
import { SortableSection } from "./grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionListProps {
	expandedSectionId: null | string;
	handleAddNewSection: (parentId?: null | string) => Promise<void>;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleSectionInteraction: (sectionId: string) => void;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	isDetailedSection: (section: GrantSection) => boolean;
	mainSections: GrantSection[];
	newlyCreatedSectionIds: Set<string>;
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

const handleMainToSubReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	dialogRef: React.RefObject<null | WizardDialogRef>,
	zone?: null | ZoneType,
): Promise<void> => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);
	const newParentId = determineNewParentId(overItem, zone ?? "child");

	if (hasActiveSubSections && overItem.parent_id === activeItem.id) {
		toast.info("Cannot move a section into its own sub-section");
		return;
	}

	if (!hasActiveSubSections) {
		await executeMainToSubConversion(
			sections,
			activeIndex,
			overIndex,
			activeItem,
			newParentId,
			toUpdateGrantSection,
			updateGrantSections,
		);
		return;
	}

	const handleConfirmMove = async () => {
		dialogRef.current?.close();

		const sectionsWithoutSubs = sections.filter((section) => section.parent_id !== activeItem.id);
		const newActiveIndex = sectionsWithoutSubs.findIndex((s) => s.id === activeItem.id);
		const newOverIndex = sectionsWithoutSubs.findIndex((s) => s.id === overItem.id);

		if (newActiveIndex !== -1 && newOverIndex !== -1) {
			await executeMainToSubConversion(
				sectionsWithoutSubs,
				newActiveIndex,
				newOverIndex,
				activeItem,
				newParentId,
				toUpdateGrantSection,
				updateGrantSections,
			);
		}
	};

	dialogRef.current?.open({
		content: null,
		description:
			"Converting a main section into a secondary section will permanently remove any associated secondary sections, if they exist. This action cannot be undone.",
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
				<AppButton data-testid="confirm-move-button" onClick={handleConfirmMove} variant="primary">
					Convert and Remove
				</AppButton>
			</div>
		),
		minWidth: "min-w-xl",
		title: "This action will affect the section structure!",
	});
};

const handleSubToMainReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	zone?: null | ZoneType,
): Promise<boolean> => {
	const newParentId = zone === "sibling" ? null : determineNewParentId(overItem, zone ?? "child");
	const targetIndexInChildZone = activeIndex < overIndex ? overIndex : overIndex + 1;
	const targetIndex = zone === "sibling" ? overIndex : targetIndexInChildZone;

	if (
		zone !== "sibling" &&
		activeItem.parent_id === overItem.id &&
		newParentId === overItem.id &&
		activeIndex === targetIndex
	) {
		return false;
	}

	await updateReorder(sections, activeIndex, targetIndex, toUpdateGrantSection, updateGrantSections, (section) =>
		section.id === activeItem.id ? newParentId : section.parent_id,
	);
	return true;
};

const handleSubToSubReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
): Promise<boolean> => {
	const newParentId = determineNewParentId(overItem, "child");
	const hasParentChanged = activeItem.parent_id !== newParentId;

	const isSectionLater = activeIndex > overIndex;
	if (!hasParentChanged && isSectionLater && activeIndex === overIndex + 1) {
		return false;
	}

	const targetIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
	const parentAssignmentFn = hasParentChanged
		? (section: GrantSection) => (section.id === activeItem.id ? newParentId : section.parent_id)
		: undefined;

	await updateReorder(
		sections,
		activeIndex,
		targetIndex,
		toUpdateGrantSection,
		updateGrantSections,
		parentAssignmentFn,
	);
	return true;
};

const handleMainToMainChildZoneReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	dialogRef: React.RefObject<null | WizardDialogRef>,
): Promise<void> => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);
	const newParentId = overItem.id;

	if (hasActiveSubSections && overItem.parent_id === activeItem.id) {
		toast.info("Cannot move a section into its own sub-section");
		return;
	}

	if (!hasActiveSubSections) {
		const targetIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
		await updateReorder(sections, activeIndex, targetIndex, toUpdateGrantSection, updateGrantSections, (section) =>
			section.id === activeItem.id ? newParentId : section.parent_id,
		);
		return;
	}

	const handleConfirmMove = async () => {
		dialogRef.current?.close();

		const sectionsWithoutSubs = sections.filter((section) => section.parent_id !== activeItem.id);
		const newActiveIndex = sectionsWithoutSubs.findIndex((s) => s.id === activeItem.id);
		const newOverIndex = sectionsWithoutSubs.findIndex((s) => s.id === overItem.id);

		if (newActiveIndex !== -1 && newOverIndex !== -1) {
			const targetIndex = newActiveIndex < newOverIndex ? newOverIndex : newOverIndex + 1;
			await updateReorder(
				sectionsWithoutSubs,
				newActiveIndex,
				targetIndex,
				toUpdateGrantSection,
				updateGrantSections,
				(section) => (section.id === activeItem.id ? newParentId : section.parent_id),
			);
		}
	};

	dialogRef.current?.open({
		content: null,
		description:
			"Converting a main section into a secondary section will permanently remove any associated secondary sections, if they exist. This action cannot be undone.",
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
				<AppButton data-testid="confirm-move-button" onClick={handleConfirmMove} variant="primary">
					Convert and Remove
				</AppButton>
			</div>
		),
		minWidth: "min-w-xl",
		title: "This action will affect the section structure!",
	});
};

const handleMainToMainReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	zone: null | ZoneType,
	dialogRef: React.RefObject<null | WizardDialogRef>,
): Promise<unknown> => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);
	const hasOverSubSections = hasSubSections(overItem.id, sections);

	if (zone === "child") {
		await handleMainToMainChildZoneReorder(
			sections,
			activeIndex,
			overIndex,
			activeItem,
			overItem,
			toUpdateGrantSection,
			updateGrantSections,
			dialogRef,
		);
		return;
	}

	if (hasActiveSubSections) {
		const reorderedSections = reorderMainWhenOverMainHasSubSections(sections, activeItem.id, overItem.id, overItem);

		await updateBackendWithReorderedSections(reorderedSections, toUpdateGrantSection, updateGrantSections);
		return;
	}

	const targetIndex = hasOverSubSections
		? getTargetIndexForMainSectionReorder(sections, overItem.id, overIndex, activeIndex)
		: overIndex;

	await updateReorder(sections, activeIndex, targetIndex, toUpdateGrantSection, updateGrantSections);
};

export function DragDropSectionManager({
	dialogRef,
	isDetailedSection,
}: {
	dialogRef: RefObject<null | WizardDialogRef>;
	isDetailedSection: (section: GrantSection) => boolean;
}) {
	const application = useApplicationStore((state) => state.application);
	const grantSections = application?.grant_template?.grant_sections ?? [];
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(null);
	const [newlyCreatedSectionIds, setNewlyCreatedSectionIds] = useState<Set<string>>(new Set());
	const [pendingParentChange, setPendingParentChange] = useState<{
		newParentId: null | string;
		sectionId: string;
	} | null>(null);
	const [dragOverState, setDragOverState] = useState<{
		overId: null | string;
		zone: null | ZoneType;
	}>({ overId: null, zone: null });
	const dragStateRef = useRef({
		activeIndex: -1,
		activeItem: null as GrantSection | null,
		isAnyDragging: false,
		overIndex: -1,
		overItem: null as GrantSection | null,
		zone: null as null | ZoneType,
		zonePercent: null as null | number,
	});

	const getDragState = useCallback(
		() => ({
			...dragStateRef.current,
			dragOverId: dragOverState.overId,
			dragOverZone: dragOverState.zone,
			sections: grantSections,
		}),
		[grantSections, dragOverState],
	);

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

			const filteredSections = grantSections.filter((section) => !sectionsToDelete.includes(section.id));
			const reorderedSections = assignOrderAndParent(filteredSections);
			const updatedSections = reorderedSections.map(toUpdateGrantSection);
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
			const isSubsection = parentId !== null;
			let insertIndex: number;

			if (isSubsection && parentId) {
				const parentIndex = grantSections.findIndex((s) => s.id === parentId);
				if (parentIndex === -1) return;

				insertIndex = parentIndex + 1;
			} else {
				insertIndex = 0;
			}

			const sectionsToUpdate = grantSections.map(toUpdateGrantSection);

			const newSectionId = `section-${crypto.randomUUID()}`;
			const newSection: UpdateGrantSection = {
				depends_on: [],
				generation_instructions: "",
				id: newSectionId,
				is_clinical_trial: null,
				is_detailed_research_plan: null,
				keywords: [],
				max_words: 3000,
				order: 0,
				parent_id: parentId,
				search_queries: [],
				title: isSubsection ? "New Sub-section" : "New Section",
				topics: [],
			};

			sectionsToUpdate.splice(insertIndex, 0, newSection);

			const finalSections = sectionsToUpdate.map((section, index) => ({
				...section,
				order: index,
			}));

			await useApplicationStore.getState().updateGrantSections(finalSections);

			setNewlyCreatedSectionIds((prev) => new Set([newSectionId, ...prev]));
		},
		[grantSections, toUpdateGrantSection],
	);

	const handleSectionInteraction = useCallback(
		(sectionId: string) => {
			if (newlyCreatedSectionIds.has(sectionId)) {
				setNewlyCreatedSectionIds((prev) => {
					const next = new Set(prev);
					next.delete(sectionId);
					return next;
				});
			}
		},
		[newlyCreatedSectionIds],
	);

	// Initialize sensors for drag and drop
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				delay: 100,
				distance: 8,
				tolerance: 20,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 100,
				tolerance: 20,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			log.info("[DragDropSectionManager] handleDragStart", {
				activeId: event.active.id,
			});

			const activeItem = grantSections.find((s) => s.id === event.active.id);
			if (!activeItem) return;

			log.info("[DragDropSectionManager] Found active item", {
				activeItemId: activeItem.id,
				activeItemTitle: activeItem.title,
			});

			if (expandedSectionId !== null) {
				setExpandedSectionId(null);
			}

			const activeIndex = grantSections.findIndex((s) => s.id === activeItem.id);
			dragStateRef.current = {
				...dragStateRef.current,
				activeIndex,
				activeItem,
				isAnyDragging: true,
			};

			useDragOverlayStore.getState().setActiveItem(activeItem);
		},
		[grantSections, expandedSectionId],
	);

	const handleDragMove = useCallback((event: DragMoveEvent) => {
		if (!event.collisions || event.collisions.length === 0) {
			return;
		}

		const [collision] = event.collisions;

		if (collision.data && (Object.hasOwn(collision.data, "zone") || Object.hasOwn(collision.data, "zonePercent"))) {
			const zone = (collision.data.zone as null | undefined | ZoneType) ?? null;
			const zonePercent = (collision.data.zonePercent as null | number | undefined) ?? null;

			dragStateRef.current = {
				...dragStateRef.current,
				zone,
				zonePercent,
			};

			setDragOverState((prev) => ({
				...prev,
				zone,
			}));
		}
	}, []);

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event;

			log.info("[DragDropSectionManager] handleDragOver", {
				activeId: active.id,
				overId: over?.id,
			});

			if (!over) {
				dragStateRef.current = {
					...dragStateRef.current,
					overIndex: -1,
					overItem: null,
				};
				setDragOverState({ overId: null, zone: null });
				return;
			}

			const activeItem = grantSections.find((s) => s.id === active.id);
			const overItem = grantSections.find((s) => s.id === over.id);

			if (!overItem) return;

			const overIndex = grantSections.findIndex((s) => s.id === overItem.id);
			const activeIndex = activeItem ? grantSections.findIndex((s) => s.id === activeItem.id) : -1;

			dragStateRef.current = {
				...dragStateRef.current,
				activeIndex,
				activeItem: activeItem ?? null,
				overIndex,
				overItem,
			};

			// Handle last subsection special case
			if (activeItem && overItem.parent_id === null && hasSubSections(overItem.id, grantSections)) {
				const { zone } = dragStateRef.current;
				if (zone !== "child" && !(activeItem.parent_id !== null && activeIndex > overIndex)) {
					const subsections = grantSections.filter((s) => s.parent_id === overItem.id);
					const lastSubsection = subsections.at(-1);
					if (lastSubsection) {
						setDragOverState({ overId: lastSubsection.id, zone });
						return;
					}
				}
			}

			setDragOverState({
				overId: overItem.id,
				zone: dragStateRef.current.zone,
			});
		},
		[grantSections],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;

			log.info("[DragDropSectionManager] handleDragEnd", {
				activeId: active.id,
				overId: over?.id,
			});

			useDragOverlayStore.getState().clearActiveItem();

			if (pendingParentChange) {
				setPendingParentChange(null);
			}

			setDragOverState({ overId: null, zone: null });

			const resetDragState = () => {
				dragStateRef.current = {
					activeIndex: -1,
					activeItem: null,
					isAnyDragging: false,
					overIndex: -1,
					overItem: null,
					zone: null,
					zonePercent: null,
				};
			};

			if (!over || active.id === over.id) {
				resetDragState();
				return;
			}

			const activeItem = grantSections.find((s) => s.id === active.id);
			const overItem = grantSections.find((s) => s.id === over.id);

			if (!(activeItem && overItem)) {
				resetDragState();
				return;
			}

			const activeIndex = grantSections.findIndex((s) => s.id === activeItem.id);
			const overIndex = grantSections.findIndex((s) => s.id === overItem.id);

			log.info("[DragDropSectionManager] Processing reorder", {
				activeIndex,
				overIndex,
				zone: dragStateRef.current.zone,
			});

			const isActiveMain = activeItem.parent_id === null;
			const isOverMain = overItem.parent_id === null;

			if (isActiveMain && isOverMain) {
				await handleMainToMainReorder(
					grantSections,
					activeIndex,
					overIndex,
					activeItem,
					overItem,
					toUpdateGrantSection,
					useApplicationStore.getState().updateGrantSections,
					dragStateRef.current.zone,
					dialogRef,
				);
			} else if (!(isActiveMain || isOverMain)) {
				await handleSubToSubReorder(
					grantSections,
					activeIndex,
					overIndex,
					activeItem,
					overItem,
					toUpdateGrantSection,
					useApplicationStore.getState().updateGrantSections,
				);
			} else if (!isActiveMain && isOverMain) {
				await handleSubToMainReorder(
					grantSections,
					activeIndex,
					overIndex,
					activeItem,
					overItem,
					toUpdateGrantSection,
					useApplicationStore.getState().updateGrantSections,
					dragStateRef.current.zone,
				);
			} else {
				await handleMainToSubReorder(
					grantSections,
					activeIndex,
					overIndex,
					activeItem,
					overItem,
					toUpdateGrantSection,
					useApplicationStore.getState().updateGrantSections,
					dialogRef,
				);
			}

			resetDragState();
		},
		[grantSections, pendingParentChange, toUpdateGrantSection, dialogRef],
	);

	const sortedSections = useMemo(() => [...grantSections].toSorted((a, b) => a.order - b.order), [grantSections]);

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

	const { activeItem } = useDragOverlayStore();
	const sortableIds = useMemo(() => grantSections.map((s) => s.id), [grantSections]);

	return (
		<div className="flex flex-col size-full" data-testid="application-structure-sections">
			<div className="mb-2 flex justify-end">
				<AppButton
					data-testid="add-new-section-button"
					leftIcon={<Plus />}
					onClick={() => handleAddNewSection()}
					size="sm"
					variant="secondary"
				>
					Add New Section
				</AppButton>
			</div>
			<ScrollArea className="flex-1">
				<DndContext
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					onDragMove={handleDragMove}
					onDragOver={handleDragOver}
					onDragStart={handleDragStart}
					sensors={sensors}
				>
					<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
						<DragDropContext.Provider value={{ getDragState }}>
							<div className="mb-3 space-y-2 p-1">
								{grantSections.length > 0 && (
									<SectionList
										expandedSectionId={expandedSectionId}
										handleAddNewSection={handleAddNewSection}
										handleDeleteSection={handleDeleteSection}
										handleSectionInteraction={handleSectionInteraction}
										handleUpdateSection={handleUpdateSection}
										isDetailedSection={isDetailedSection}
										mainSections={mainSections}
										newlyCreatedSectionIds={newlyCreatedSectionIds}
										subsectionsByParent={subsectionsByParent}
										toggleSectionExpanded={toggleSectionExpanded}
										toUpdateGrantSection={toUpdateGrantSection}
									/>
								)}
							</div>
						</DragDropContext.Provider>
					</SortableContext>
					<DragOverlay>
						{activeItem && <SectionDragOverlay activeSection={activeItem as GrantSection} />}
					</DragOverlay>
				</DndContext>
			</ScrollArea>
		</div>
	);
}

function SectionDragOverlay({ activeSection }: { activeSection: GrantSection }) {
	const isSubsection = activeSection.parent_id !== null;
	const hasMaxWords = "max_words" in activeSection && Boolean(activeSection.max_words);

	return (
		<div
			className={`group rounded-lg border-2 border-primary bg-white/95 backdrop-blur-sm shadow-2xl transition-all duration-200 ${isSubsection ? "ml-12 px-3 py-2" : "px-3 py-4"}`}
			style={{
				minWidth: isSubsection ? "410px" : "500px",
				opacity: 0.9,
				transform: "rotate(-2deg)",
			}}
		>
			<div className={`flex items-center justify-start ${isSubsection ? "gap-2" : "gap-5"}`}>
				<div className="relative size-6 cursor-grabbing">
					<GripVertical className="size-6 text-primary animate-pulse" />
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
	handleSectionInteraction,
	handleUpdateSection,
	isDetailedSection,
	mainSections,
	newlyCreatedSectionIds,
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
						isNewlyCreated={newlyCreatedSectionIds.has(section.id)}
						onAddSubsection={() => handleAddNewSection(section.id)}
						onDelete={() => handleDeleteSection(section.id)}
						onSectionInteraction={() => {
							handleSectionInteraction(section.id);
						}}
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
							isNewlyCreated={newlyCreatedSectionIds.has(subsection.id)}
							isSubsection
							key={subsection.id}
							onDelete={() => handleDeleteSection(subsection.id)}
							onSectionInteraction={() => {
								handleSectionInteraction(subsection.id);
							}}
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
