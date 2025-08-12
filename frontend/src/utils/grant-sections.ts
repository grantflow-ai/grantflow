import { arrayMove } from "@dnd-kit/sortable";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger";

/**
 * Determines the new parent ID when moving sections in drag-and-drop operations
 * @param activeSection The section being dragged
 * @param overSection The section being dragged over
 * @returns The new parent ID for the active section
 */
export const determineNewParentId = (activeSection: GrantSection, overSection: GrantSection): null | string => {
	const activeIsChild = activeSection.parent_id !== null;
	const overIsChild = overSection.parent_id !== null;

	if (overIsChild) {
		return overSection.parent_id;
	}

	if (activeIsChild) {
		return overSection.id;
	}

	return null;
};

/**
 * Checks if a section has subsections
 * @param sectionId The ID of the section to check
 * @param sections Array of all sections
 * @returns True if the section has subsections, false otherwise
 */
export const hasSubSections = (sectionId: string, sections: GrantSection[]): boolean => {
	return sections.some((section) => section.parent_id === sectionId);
};

/**
 * Calculates the target index for main section reordering
 * @param sections Array of all sections
 * @param overItemId ID of the section being dragged over
 * @param originalIndex Original index of the section being dragged
 * @param activeIndex Current index of the active section
 * @returns Target index for reordering
 */
export const getTargetIndexForMainSectionReorder = (
	sections: GrantSection[],
	overItemId: string,
	originalIndex: number,
	activeIndex: number,
): number => {
	const lastSubSectionIndex = sections.findLastIndex((section) => section.parent_id === overItemId);

	if (lastSubSectionIndex === -1) {
		return originalIndex + 1; // Place after the main section if no subsections
	}

	return activeIndex > lastSubSectionIndex ? lastSubSectionIndex + 1 : lastSubSectionIndex;
};

/**
 * Reorders sections when moving a main section with subsections
 * @param sections Array of all sections
 * @param activeMainSectionId ID of the main section being moved
 * @param overItemId ID of the section being dragged over
 * @param overItem The section object being dragged over
 * @returns Reordered array of sections
 */
export const reorderMainWhenOverMainHasSubSections = (
	sections: GrantSection[],
	activeMainSectionId: string,
	overItemId: string,
	overItem: GrantSection,
): GrantSection[] => {
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

	const overItemLastSubIndexInRemaining = remainingSections.findLastIndex(
		(section) => section.parent_id === overItemId,
	);
	const overItemIndexInRemaining = remainingSections.findIndex((section) => section.id === overItemId);

	const insertionIndex =
		overItemLastSubIndexInRemaining === -1 ? overItemIndexInRemaining + 1 : overItemLastSubIndexInRemaining + 1;

	return [
		...remainingSections.slice(0, insertionIndex),
		...sectionsToMove,
		...remainingSections.slice(insertionIndex),
	];
};

/**
 * Assigns order and parent_id to sections based on their position in the array
 * @param sections Array of sections to assign order and parent
 * @param parentAssignmentFn Optional function to determine new parent for each section
 * @returns Array of sections with updated order and parent_id
 */
export const assignOrderAndParent = (
	sections: GrantSection[],
	parentAssignmentFn?: (section: GrantSection) => null | string,
): GrantSection[] => {
	return sections.map((section, index) => {
		return {
			...section,
			order: index,
			parent_id: parentAssignmentFn?.(section) ?? section.parent_id ?? null,
		};
	});
};

/**
 * Orchestrates section reordering with arrayMove and order/parent assignment
 * @param sections Array of all sections
 * @param activeIndex Current index of active section
 * @param targetIndex Target index for reordering
 * @param toUpdateGrantSection Function to convert section to update format
 * @param updateGrantSections Function to update sections in store
 * @param parentAssignmentFn Optional function to reassign parent relationships
 */
export const updateReorder = async (
	sections: GrantSection[],
	activeIndex: number,
	targetIndex: number,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	parentAssignmentFn?: (section: GrantSection) => null | string,
): Promise<void> => {
	if (sections.length === 0) {
		return;
	}

	const reorderedSections = arrayMove(sections, activeIndex, targetIndex);
	await updateBackendWithReorderedSections(
		reorderedSections,
		toUpdateGrantSection,
		updateGrantSections,
		parentAssignmentFn,
	);
};

/**
 * Updates sections that are already reordered with order/parent assignment
 * @param reorderedSections Pre-reordered array of sections
 * @param toUpdateGrantSection Function to convert section to update format
 * @param updateGrantSections Function to update sections in store
 * @param parentAssignmentFn Optional function to reassign parent relationships
 */
export const updateBackendWithReorderedSections = async (
	reorderedSections: GrantSection[],
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	parentAssignmentFn?: (section: GrantSection) => null | string,
): Promise<void> => {
	const updatedSectionsWithOrderAndParent = assignOrderAndParent(reorderedSections, parentAssignmentFn);
	await updateGrantSections(updatedSectionsWithOrderAndParent.map(toUpdateGrantSection));
};

/**
 * Executes main-to-subsection conversion with correct target index calculation
 * @param sections Array of all sections
 * @param activeIndex Current index of active section
 * @param overIndex Index of section being dragged over
 * @param activeItem The section being converted
 * @param newParentId New parent ID for the converted section
 * @param toUpdateGrantSection Function to convert section to update format
 * @param updateGrantSections Function to update sections in store
 */
export const executeMainToSubConversion = async (
	sections: GrantSection[],
	activeIndex: number,
	overIndex: number,
	activeItem: GrantSection,
	newParentId: null | string,
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
): Promise<void> => {
	const targetIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
	await updateReorder(sections, activeIndex, targetIndex, toUpdateGrantSection, updateGrantSections, (section) =>
		section.id === activeItem.id ? newParentId : section.parent_id,
	);
};

/**
 * Drop indicator visibility calculation result
 */
export interface DropIndicatorState {
	isSubsectionWidth: boolean;
	showAbove: boolean;
	showBelow: boolean;
}

/**
 * Calculates drop indicator visibility based on drag-and-drop context
 * Uses optimized logic with early returns and safe fallbacks
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex drag-and-drop logic needs to stay cohesive
export function calculateDropIndicatorVisibility(
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	sections: GrantSection[],
	currentSectionId: string,
): DropIndicatorState {
	// Default fallback - below section with matching width
	const defaultResult: DropIndicatorState = {
		isSubsectionWidth: overItem.parent_id !== null,
		showAbove: false,
		showBelow: true,
	};

	// Early return for same item (safety check)
	if (activeItem.id === overItem.id) {
		return { isSubsectionWidth: false, showAbove: false, showBelow: false };
	}

	// Early return for invalid indices
	if (activeIndex === -1 || overIndex === -1) {
		return defaultResult;
	}

	const isActiveMain = activeItem.parent_id === null;
	const isOverMain = overItem.parent_id === null;

	try {
		// Special case: Last subsection of dragged-over main section gets full width
		if (isOverMain && hasSubSections(overItem.id, sections)) {
			const subsections = sections.filter((s) => s.parent_id === overItem.id).sort((a, b) => a.order - b.order);

			const lastSubsection = subsections.at(-1);

			if (currentSectionId === lastSubsection?.id) {
				return {
					isSubsectionWidth: false, // Full main section width!
					showAbove: false,
					showBelow: true,
				};
			}
		}

		// Scenario 1: Sub → Main (always below with main width)
		if (!isActiveMain && isOverMain) {
			return {
				isSubsectionWidth: false,
				showAbove: false,
				showBelow: true,
			};
		}

		// Scenario 2: Main → Sub (above with subsection width, validate not own child)
		if (isActiveMain && !isOverMain) {
			const hasActiveSubSections = hasSubSections(activeItem.id, sections);
			if (hasActiveSubSections && overItem.parent_id === activeItem.id) {
				// Invalid: can't move into own subsection
				return { isSubsectionWidth: false, showAbove: false, showBelow: false };
			}
			return {
				isSubsectionWidth: true,
				showAbove: true,
				showBelow: false,
			};
		}

		// Scenario 3: Sub → Sub (same or different parent)
		if (!(isActiveMain || isOverMain)) {
			const newParentId = determineNewParentId(activeItem, overItem);
			const hasParentChanged = activeItem.parent_id !== newParentId;

			// No-op case: adjacent with same parent
			if (!hasParentChanged && Math.abs(activeIndex - overIndex) === 1 && activeIndex === overIndex + 1) {
				return { isSubsectionWidth: true, showAbove: false, showBelow: false };
			}

			const targetIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
			return {
				isSubsectionWidth: true,
				showAbove: activeIndex > targetIndex,
				showBelow: activeIndex < targetIndex,
			};
		}

		// Scenario 4: Main → Main
		if (isActiveMain && isOverMain) {
			const hasActiveSubSections = hasSubSections(activeItem.id, sections);
			const hasOverSubSections = hasSubSections(overItem.id, sections);

			// For complex cases with subsections, use safe default
			if (hasActiveSubSections || hasOverSubSections) {
				return defaultResult;
			}

			// Simple main-to-main reorder
			return {
				isSubsectionWidth: false,
				showAbove: activeIndex > overIndex,
				showBelow: activeIndex < overIndex,
			};
		}
	} catch (error) {
		// Any calculation errors - fall back to safe default
		log.warn("Drop indicator calculation failed, using default", { activeItem, error, overItem });
		return defaultResult;
	}

	return defaultResult;
}
