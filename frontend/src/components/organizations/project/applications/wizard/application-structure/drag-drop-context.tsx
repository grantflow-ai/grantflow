"use client";

import { createContext, useContext } from "react";
import type { GrantSection } from "@/types/grant-sections";

export interface ZoneCollisionData {
	zone: null | ZoneType;
	zonePercent: null | number;
}

export type ZoneType = "child" | "sibling";

// To support data ref instead of state subscription to avoid re-renders during drag
interface DragDropContext {
	getDragState: () => DragDropContextData;
}

interface DragDropContextData extends ZoneCollisionData {
	activeIndex: number;
	activeItem: GrantSection | null;
	isAnyDragging: boolean;
	overIndex: number;
	overItem: GrantSection | null;
	sections: GrantSection[];
}

const DragDropContext = createContext<DragDropContext | null>(null);

export function useDragDropContext(): DragDropContextData {
	const context = useContext(DragDropContext);
	if (!context) {
		throw new Error("useDragDropContext must be used within a DragDropProvider");
	}
	return context.getDragState();
}

export { DragDropContext };
export type { DragDropContextData };
