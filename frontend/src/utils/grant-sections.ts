import { arrayMove } from "@dnd-kit/sortable";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger/client";

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
		return originalIndex + 1;
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
/**
 * Calculates drop indicator for last subsection when dropping over main section with subsections
 * @param overItem The section being dragged over
 * @param sections Array of all sections
 * @param currentSectionId ID of the current section being evaluated
 * @returns Drop indicator state or null if not applicable
 */
const calculateLastSubsectionDropIndicator = (
	overItem: GrantSection,
	sections: GrantSection[],
	currentSectionId: string,
): DropIndicatorState | null => {
	if (!(overItem.parent_id === null && hasSubSections(overItem.id, sections))) {
		return null;
	}

	const subsections = sections.filter((s) => s.parent_id === overItem.id).sort((a, b) => a.order - b.order);
	const lastSubsection = subsections.at(-1);

	if (currentSectionId === lastSubsection?.id) {
		return {
			isSubsectionWidth: false,
			showAbove: false,
			showBelow: true,
		};
	}

	return null;
};

/**
 * Calculates drop indicator when dragging subsection to main section
 * @param activeItem The subsection being dragged
 * @param overItem The main section being dragged over
 * @param activeIndex Current index of active subsection
 * @param overIndex Index of main section being dragged over
 * @param defaultResult Default drop indicator state to use as fallback
 * @returns Drop indicator state for sub-to-main drag scenario
 */
const calculateSubToMainDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	defaultResult: DropIndicatorState,
): DropIndicatorState => {
	if (
		activeItem.parent_id === overItem.id &&
		Math.abs(activeIndex - overIndex) === 1 &&
		activeIndex === overIndex + 1
	) {
		return { isSubsectionWidth: true, showAbove: false, showBelow: false };
	}

	return {
		...defaultResult,
		isSubsectionWidth: true,
	};
};

/**
 * Calculates drop indicator when dragging main section to subsection
 * @param activeItem The section being dragged
 * @param overItem The section being dragged over
 * @param sections Array of all sections
 * @param defaultResult Default drop indicator state to use as fallback
 * @returns Drop indicator state for main-to-sub drag scenario
 */
const calculateMainToSubDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	sections: GrantSection[],
	defaultResult: DropIndicatorState,
): DropIndicatorState => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);

	if (hasActiveSubSections && overItem.parent_id === activeItem.id) {
		return { isSubsectionWidth: false, showAbove: false, showBelow: false };
	}

	return defaultResult;
};

/**
 * Calculates drop indicator when dragging subsection to subsection
 * @param activeItem The section being dragged
 * @param overItem The section being dragged over
 * @param activeIndex Current index of active section
 * @param overIndex Index of section being dragged over
 * @param defaultResult Default drop indicator state to use as fallback
 * @returns Drop indicator state for sub-to-sub drag scenario
 */
const calculateSubToSubDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	defaultResult: DropIndicatorState,
): DropIndicatorState => {
	const newParentId = determineNewParentId(activeItem, overItem);
	const hasParentChanged = activeItem.parent_id !== newParentId;

	if (!hasParentChanged && Math.abs(activeIndex - overIndex) === 1 && activeIndex === overIndex + 1) {
		return { isSubsectionWidth: true, showAbove: false, showBelow: false };
	}

	return defaultResult;
};

/**
 * Calculates drop indicator when dragging main section to main section
 * @param activeItem The section being dragged
 * @param overItem The section being dragged over
 * @param activeIndex Current index of active section
 * @param overIndex Index of section being dragged over
 * @param sections Array of all sections
 * @param defaultResult Default drop indicator state to use as fallback
 * @returns Drop indicator state for main-to-main drag scenario
 */
const calculateMainToMainDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	sections: GrantSection[],
	defaultResult: DropIndicatorState,
): DropIndicatorState => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);
	const hasOverSubSections = hasSubSections(overItem.id, sections);

	if (!(hasActiveSubSections || hasOverSubSections)) {
		return {
			isSubsectionWidth: false,
			showAbove: activeIndex > overIndex,
			showBelow: activeIndex < overIndex,
		};
	}

	if ((hasActiveSubSections || hasOverSubSections) && activeIndex > overIndex) {
		// Check if active main is immediately next to over main (no other main sections between them)
		const mainSectionsBetween = sections
			.slice(overIndex + 1, activeIndex)
			.filter((section) => section.parent_id === null);

		if (mainSectionsBetween.length === 0) {
			return { isSubsectionWidth: false, showAbove: false, showBelow: false };
		}
	}

	return defaultResult;
};

/**
 * Calculates drop indicator visibility based on drag-and-drop context
 * Uses optimized logic with early returns and safe fallbacks
 * @param activeItem The section being dragged
 * @param overItem The section being dragged over
 * @param activeIndex Current index of active section
 * @param overIndex Index of section being dragged over
 * @param sections Array of all sections
 * @param currentSectionId ID of the current section being evaluated
 * @returns Drop indicator state with visibility and positioning
 */
export function calculateDropIndicatorVisibility(
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	sections: GrantSection[],
	currentSectionId: string,
): DropIndicatorState {
	const defaultResult: DropIndicatorState = {
		isSubsectionWidth: overItem.parent_id !== null,
		showAbove: false,
		showBelow: true,
	};

	if (activeItem.id === overItem.id) {
		return { isSubsectionWidth: false, showAbove: false, showBelow: false };
	}

	if (activeIndex === -1 || overIndex === -1) {
		return defaultResult;
	}

	const isActiveMain = activeItem.parent_id === null;
	const isOverMain = overItem.parent_id === null;

	try {
		const lastSubsectionResult = calculateLastSubsectionDropIndicator(overItem, sections, currentSectionId);
		if (lastSubsectionResult) {
			return lastSubsectionResult;
		}

		if (!isActiveMain && isOverMain) {
			return calculateSubToMainDropIndicator(activeItem, overItem, activeIndex, overIndex, defaultResult);
		}

		if (isActiveMain && !isOverMain) {
			return calculateMainToSubDropIndicator(activeItem, overItem, sections, defaultResult);
		}

		if (!(isActiveMain || isOverMain)) {
			return calculateSubToSubDropIndicator(activeItem, overItem, activeIndex, overIndex, defaultResult);
		}

		if (isActiveMain && isOverMain) {
			return calculateMainToMainDropIndicator(
				activeItem,
				overItem,
				activeIndex,
				overIndex,
				sections,
				defaultResult,
			);
		}
	} catch (error) {
		log.warn("Drop indicator calculation failed, using default", { activeItem, error, overItem });
		return defaultResult;
	}

	return defaultResult;
}
