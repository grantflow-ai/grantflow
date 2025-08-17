"use client";

import { GripVertical } from "lucide-react";
import Image from "next/image";
import type { RefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/shared/wizard-dialog";
import { type DragDropHandlers, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
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
import { createZoneCollisionDetection } from "@/utils/zone-collision-detection";
import { DragDropContext, type DragDropContextData, type ZoneType } from "./drag-drop-context";
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

const updateDragOverVisualState = (overId: string | undefined, dragState: DragDropContextData): void => {
	const prevOverElement = document.querySelector<HTMLElement>('[data-drag-over="true"]');

	if (overId) {
		const overElement = document.querySelector<HTMLElement>(`[data-sortable-id="${overId}"]`);

		if (prevOverElement && prevOverElement !== overElement) {
			delete prevOverElement.dataset.dragOver;
		}

		if (setLastSubsectionDragOver(dragState)) {
			return;
		}

		if (overElement) {
			overElement.dataset.dragOver = "true";
		}
	} else if (prevOverElement) {
		delete prevOverElement.dataset.dragOver;
	}
};

const updateDragWideVisualState = (zone: null | ZoneType): void => {
	const dragOverElement = document.querySelector<HTMLElement>('[data-drag-over="true"]');

	if (dragOverElement) {
		dragOverElement.dataset.dragWide = zone === "child" ? "true" : "false";
	}
};

const setLastSubsectionDragOver = (dragState: DragDropContextData): boolean => {
	const { activeIndex, activeItem, overIndex, overItem, sections, zone } = dragState;

	if (
		!(
			activeItem &&
			overItem &&
			sections.length > 0 &&
			overItem.parent_id === null &&
			hasSubSections(overItem.id, sections)
		)
	) {
		return false;
	}

	if (zone === "child") {
		return false;
	}

	if (activeItem.parent_id !== null && activeIndex > overIndex) {
		return false;
	}

	const subsections = sections.filter((s) => s.parent_id === overItem.id);
	const lastSubsection = subsections.at(-1);

	if (!lastSubsection) {
		return false;
	}

	const lastSubElement = document.querySelector<HTMLElement>(`[data-sortable-id="${lastSubsection.id}"]`);
	if (lastSubElement) {
		lastSubElement.dataset.dragOver = "true";
		return true;
	}
	return false;
};

const clearDragOverVisualState = (): void => {
	const allDragOverElements = document.querySelectorAll<HTMLElement>('[data-drag-over="true"]');
	allDragOverElements.forEach((element) => {
		delete element.dataset.dragOver;
		delete element.dataset.dragWide;
	});
};

const handleMainToSubReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	overItem: GrantSection,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	dialogRef: React.RefObject<{ close: () => void; open: (options: any) => void } | null>,
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
	dialogRef: React.RefObject<{ close: () => void; open: (options: any) => void } | null>,
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
	dialogRef: React.RefObject<{ close: () => void; open: (options: any) => void } | null>,
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
	onAddSection,
}: {
	dialogRef: RefObject<null | WizardDialogRef>;
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
}) {
	const application = useApplicationStore((state) => state.application);
	const grantSections = application?.grant_template?.grant_sections ?? [];
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(null);
	const [pendingParentChange, setPendingParentChange] = useState<{
		newParentId: null | string;
		sectionId: string;
	} | null>(null);
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
			sections: grantSections,
		}),
		[grantSections],
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
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const dragHandlers: DragDropHandlers<GrantSection> = useMemo(
		() => ({
			onDragEnd: (_event) => {
				if (pendingParentChange) {
					setPendingParentChange(null);
				}
				clearDragOverVisualState();
				dragStateRef.current = {
					activeIndex: -1,
					activeItem: null,
					isAnyDragging: false,
					overIndex: -1,
					overItem: null,
					zone: null,
					zonePercent: null,
				};
			},
			onDragMove: (event) => {
				if (!event.collisions || event.collisions.length === 0) {
					return;
				}

				const [collision] = event.collisions;

				if (
					collision.data &&
					(Object.hasOwn(collision.data, "zone") || Object.hasOwn(collision.data, "zonePercent"))
				) {
					const zone = (collision.data.zone as null | undefined | ZoneType) ?? null;
					const zonePercent = (collision.data.zonePercent as null | number | undefined) ?? null;

					dragStateRef.current = {
						...dragStateRef.current,
						zone,
						zonePercent,
					};

					updateDragWideVisualState(zone);
				}
			},
			onDragOver: (_event, activeItem, overItem) => {
				const overIndex = overItem ? grantSections.findIndex((s) => s.id === overItem.id) : -1;

				dragStateRef.current = {
					...dragStateRef.current,
					overIndex,
					overItem: overItem ?? null,
				};

				updateDragOverVisualState(overItem?.id, {
					...dragStateRef.current,
					activeItem: activeItem ?? null,
					overIndex,
					overItem: overItem ?? null,
					sections: grantSections,
				});
			},
			onDragStart: (_event, activeItem) => {
				if (expandedSectionId !== null) {
					setExpandedSectionId(null);
				}
				const activeIndex = activeItem ? grantSections.findIndex((s) => s.id === activeItem.id) : -1;

				dragStateRef.current = {
					...dragStateRef.current,
					activeIndex,
					activeItem: activeItem ?? null,
					isAnyDragging: activeIndex !== -1,
				};
			},
			onReorder: async (sections, activeIndex, overIndex, activeItem, overItem) => {
				if (activeItem.id === overItem.id) {
					return;
				}

				const isActiveMain = activeItem.parent_id === null;
				const isOverMain = overItem.parent_id === null;

				if (isActiveMain && isOverMain) {
					await handleMainToMainReorder(
						sections,
						activeIndex,
						overIndex,
						activeItem,
						overItem,
						toUpdateGrantSection,
						useApplicationStore.getState().updateGrantSections,
						dragStateRef.current.zone,
						dialogRef,
					);
					return;
				}

				if (!(isActiveMain || isOverMain)) {
					await handleSubToSubReorder(
						sections,
						activeIndex,
						overIndex,
						activeItem,
						overItem,
						toUpdateGrantSection,
						useApplicationStore.getState().updateGrantSections,
					);
					return;
				}

				if (!isActiveMain && isOverMain) {
					await handleSubToMainReorder(
						sections,
						activeIndex,
						overIndex,
						activeItem,
						overItem,
						toUpdateGrantSection,
						useApplicationStore.getState().updateGrantSections,
						dragStateRef.current.zone,
					);
					return;
				}

				await handleMainToSubReorder(
					sections,
					activeIndex,
					overIndex,
					activeItem,
					overItem,
					toUpdateGrantSection,
					useApplicationStore.getState().updateGrantSections,
					dialogRef,
				);
			},
		}),
		[pendingParentChange, expandedSectionId, toUpdateGrantSection, dialogRef, grantSections],
	);

	const zoneCollisionDetection = useMemo(() => createZoneCollisionDetection(), []);

	const { DragDropWrapper } = useDragAndDrop<GrantSection>(dragHandlers, {
		collisionDetection: zoneCollisionDetection,
	});

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
			<DragDropContext.Provider value={{ getDragState }}>
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
			</DragDropContext.Provider>
		</DragDropWrapper>
	);
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
