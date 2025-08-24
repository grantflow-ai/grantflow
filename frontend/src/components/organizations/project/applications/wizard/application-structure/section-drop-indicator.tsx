"use client";

import { useEffect, useMemo, useState } from "react";
import type { GrantSection } from "@/types";
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
	const marginClass = position === "above" ? " mb-1" : " mt-1";
	const visibilityClasses = isVisible
		? `h-2 opacity-100 scale-y-100${marginClass}`
		: "h-0 opacity-0 scale-y-0 mb-0 mt-0";

	return (
		<div
			className={`bg-primary rounded-xs transition-all duration-300 ease-in-out ${visibilityClasses} ${isSubsectionWidth ? "ml-[6.875rem] w-[calc(100%-6.875rem)]" : "w-full"}`}
			data-testid={`drop-indicator-${position}`}
		/>
	);
}

export function SectionWithDropIndicators({ children, section }: SectionWithDropIndicatorsProps) {
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDraggedWide, setIsDraggedWide] = useState(false);

	const dragContext = useDragDropContext();
	const { isAnyDragging } = dragContext;

	useEffect(() => {
		if (!isAnyDragging) {
			setIsDraggedOver(false);
			setIsDraggedWide(false);
			return;
		}

		const checkDragState = () => {
			const element: HTMLElement | null = document.querySelector(`[data-sortable-id="${section.id}"]`);
			const isOver = element?.dataset ? Object.hasOwn(element.dataset, "dragOver") : false;
			const isWide = element?.dataset ? element.dataset.dragWide === "true" : false;
			setIsDraggedOver(isOver);
			setIsDraggedWide(isWide);
		};

		const observer = new MutationObserver(() => {
			checkDragState();
		});

		const element = document.querySelector(`[data-sortable-id="${section.id}"]`);
		if (element) {
			observer.observe(element, {
				attributeFilter: ["data-drag-over", "data-drag-wide"],
				attributes: true,
			});
		}

		checkDragState();

		return () => {
			observer.disconnect();
		};
	}, [section.id, isAnyDragging]);

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
