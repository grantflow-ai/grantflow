"use client";

import { useMemo } from "react";
import type { GrantSection } from "@/types/grant-sections";
import { calculateDropIndicatorVisibility } from "@/utils/grant-sections";
import { useDragDropContext, type ZoneType } from "./drag-drop-context";

interface SectionDropIndicatorProps {
	isSubsectionWidth: boolean;
	isVisible: boolean;
	position: "above" | "below";
}

interface SectionWithDropIndicatorsProps {
	children: React.ReactNode;
	section: GrantSection;
}

export function SectionDropIndicator({ isSubsectionWidth, isVisible, position }: SectionDropIndicatorProps) {
	const marginClass = position === "above" ? "mb-1" : "mt-1";
	const positionClass = position === "above" ? "-top-2" : "-bottom-2";
	const visibilityClasses = isVisible
		? `h-3 opacity-100 scale-y-100 ${marginClass} ${positionClass}`
		: `h-0 opacity-0 scale-y-0 mb-0 mt-0 ${positionClass}`;

	return (
		<div
			className={`absolute right-0 bg-gradient-to-r from-primary via-primary-600 to-primary rounded-sm shadow-lg transition-all duration-300 ease-in-out ${visibilityClasses} ${isSubsectionWidth ? "ml-[6.875rem] w-[calc(100%-6.875rem)]" : "w-full"}`}
			data-testid={`drop-indicator-${position}`}
		>
			{isVisible && (
				<div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
			)}
		</div>
	);
}

export function SectionWithDropIndicators({ children, section }: SectionWithDropIndicatorsProps) {
	const dragContext = useDragDropContext();
	const { dragOverId, dragOverZone, isAnyDragging } = dragContext;

	const isDraggedOver = dragOverId === section.id;
	const isDraggedWide = isDraggedOver && dragOverZone === "child";

	const dropIndicators = useMemo(() => {
		if (!(isDraggedOver && isAnyDragging)) {
			return { isSubsectionWidth: false, showAbove: false, showBelow: false };
		}

		const { activeIndex, activeItem, overIndex, overItem, sections } = dragContext;

		if (!(activeItem && overItem)) {
			return { isSubsectionWidth: false, showAbove: false, showBelow: false };
		}

		const isDirectlyDraggedOver = section.id === overItem.id;
		const isParentDraggedOver = section.parent_id === overItem.id && overItem.parent_id === null;

		if (!(isDirectlyDraggedOver || isParentDraggedOver)) {
			return { isSubsectionWidth: false, showAbove: false, showBelow: false };
		}

		const zone: ZoneType = isDraggedWide ? "child" : "sibling";
		return calculateDropIndicatorVisibility(activeItem, overItem, activeIndex, overIndex, sections, zone);
	}, [isDraggedOver, isDraggedWide, isAnyDragging, dragContext, section.id, section.parent_id]);

	return (
		<div className="relative">
			<SectionDropIndicator
				isSubsectionWidth={dropIndicators.isSubsectionWidth}
				isVisible={dropIndicators.showAbove}
				position="above"
			/>
			{children}
			<SectionDropIndicator
				isSubsectionWidth={dropIndicators.isSubsectionWidth}
				isVisible={dropIndicators.showBelow}
				position="below"
			/>
		</div>
	);
}
