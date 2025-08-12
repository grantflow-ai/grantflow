"use client";

import { useEffect, useState } from "react";
import type { GrantSection } from "@/types/grant-sections";

interface SectionDropIndicatorProps {
	isSubsection?: boolean;
	isVisible: boolean;
	position: "above" | "below";
}

interface SectionWithDropIndicatorsProps {
	children: React.ReactNode;
	isDragging: boolean;
	section: GrantSection;
}

export function SectionDropIndicator({ isSubsection = false, isVisible, position }: SectionDropIndicatorProps) {
	return (
		<div
			className={`h-2 bg-primary rounded-xs transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"} ${isSubsection ? "ml-[6.875rem] w-[calc(100%-6.875rem)]" : "w-full"} ${position === "above" ? "mb-1" : "mt-1"}`}
			data-testid={`drop-indicator-${position}`}
		/>
	);
}

export function SectionWithDropIndicators({ children, isDragging, section }: SectionWithDropIndicatorsProps) {
	const isSubsection = section.parent_id !== null;
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	useEffect(() => {
		if (!isDragging) {
			setIsDraggedOver(false);
			return;
		}

		const checkDragOverState = () => {
			const element = document.querySelector(`[data-sortable-id="${section.id}"]`);
			const isOver = element?.hasAttribute("data-drag-over") ?? false;
			setIsDraggedOver(isOver);
		};

		const observer = new MutationObserver(() => {
			checkDragOverState();
		});

		const element = document.querySelector(`[data-sortable-id="${section.id}"]`);
		if (element) {
			observer.observe(element, {
				attributeFilter: ["data-drag-over"],
				attributes: true,
			});
		}

		checkDragOverState();

		return () => {
			observer.disconnect();
		};
	}, [section.id, isDragging]);

	// Only render indicators if being dragged over (not just when dragging is active)
	if (!isDraggedOver) {
		return <>{children}</>;
	}

	return (
		<div className="relative">
			{children}
			<SectionDropIndicator isSubsection={isSubsection} isVisible={true} position="below" />
		</div>
	);
}
