import { arrayMove } from "@dnd-kit/sortable";
import type { ZoneType } from "@/components/organizations/project/applications/wizard/application-structure/drag-drop-context";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger/client";

export const determineNewParentId = (overSection: GrantSection, zone: ZoneType): null | string => {
	const overIsChild = overSection.parent_id !== null;

	if (overIsChild) {
		return overSection.parent_id;
	}

	return zone === "sibling" ? null : overSection.id;
};

export const hasSubSections = (sectionId: string, sections: GrantSection[]): boolean => {
	return sections.some((section) => section.parent_id === sectionId);
};

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

export const assignOrderAndParent = (
	sections: GrantSection[],
	parentAssignmentFn?: (section: GrantSection) => null | string,
): GrantSection[] => {
	return sections.map((section, index) => {
		const newParentId = parentAssignmentFn ? (parentAssignmentFn(section) ?? null) : (section.parent_id ?? null);
		return {
			...section,
			order: index,
			parent_id: newParentId,
		};
	});
};

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

export const updateBackendWithReorderedSections = async (
	reorderedSections: GrantSection[],
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection,
	updateGrantSections: (sections: UpdateGrantSection[]) => Promise<void>,
	parentAssignmentFn?: (section: GrantSection) => null | string,
): Promise<void> => {
	const updatedSectionsWithOrderAndParent = assignOrderAndParent(reorderedSections, parentAssignmentFn);
	await updateGrantSections(updatedSectionsWithOrderAndParent.map(toUpdateGrantSection));
};

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

export interface DropIndicatorState {
	isSubsectionWidth: boolean;
	showAbove: boolean;
	showBelow: boolean;
}

const calculateSubToMainDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	defaultResult: DropIndicatorState,
	zone?: null | ZoneType,
): DropIndicatorState => {
	if (
		zone !== "sibling" &&
		activeItem.parent_id === overItem.id &&
		Math.abs(activeIndex - overIndex) === 1 &&
		activeIndex === overIndex + 1
	) {
		return { isSubsectionWidth: true, showAbove: false, showBelow: false };
	}

	const isSubsectionWidth = zone !== "sibling";

	const showAbove = zone === "sibling" && activeIndex > overIndex;
	const showBelow = zone === "sibling" ? !showAbove : defaultResult.showBelow;

	return {
		...defaultResult,
		isSubsectionWidth,
		showAbove,
		showBelow,
	};
};

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

const calculateSubToSubDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	defaultResult: DropIndicatorState,
): DropIndicatorState => {
	const newParentId = determineNewParentId(overItem, "child");
	const hasParentChanged = activeItem.parent_id !== newParentId;

	if (!hasParentChanged && Math.abs(activeIndex - overIndex) === 1 && activeIndex === overIndex + 1) {
		return { isSubsectionWidth: true, showAbove: false, showBelow: false };
	}

	return defaultResult;
};

const calculateMainToMainDropIndicator = (
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	sections: GrantSection[],
	defaultResult: DropIndicatorState,
	zone?: null | ZoneType,
): DropIndicatorState => {
	const hasActiveSubSections = hasSubSections(activeItem.id, sections);
	const hasOverSubSections = hasSubSections(overItem.id, sections);

	const isSubsectionWidth = zone === "child";

	if (!(hasActiveSubSections || hasOverSubSections)) {
		return {
			isSubsectionWidth,
			showAbove: zone === "child" ? false : activeIndex > overIndex,
			showBelow: zone === "child" ? true : activeIndex < overIndex,
		};
	}

	if ((hasActiveSubSections || hasOverSubSections) && activeIndex > overIndex) {
		const mainSectionsBetween = sections
			.slice(overIndex + 1, activeIndex)
			.filter((section) => section.parent_id === null);

		if (mainSectionsBetween.length === 0) {
			return { isSubsectionWidth: false, showAbove: false, showBelow: false };
		}
	}

	return {
		...defaultResult,
		isSubsectionWidth,
	};
};

export function calculateDropIndicatorVisibility(
	activeItem: GrantSection,
	overItem: GrantSection,
	activeIndex: number,
	overIndex: number,
	sections: GrantSection[],
	zone?: null | ZoneType,
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
		if (!isActiveMain && isOverMain) {
			return calculateSubToMainDropIndicator(activeItem, overItem, activeIndex, overIndex, defaultResult, zone);
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
				zone,
			);
		}
	} catch (error) {
		log.warn("Drop indicator calculation failed, using default", { activeItem, error, overItem });
		return defaultResult;
	}

	return defaultResult;
}
