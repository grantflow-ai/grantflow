"use client";

import { createContext, useContext } from "react";
import type { GrantSection } from "@/types/grant-sections";

interface DragDropContextData {
	activeIndex: number;
	activeItem: GrantSection | null;
	isAnyDragging: boolean;
	overIndex: number;
	overItem: GrantSection | null;
	sections: GrantSection[];
}

// To support data ref instead of state subscription to avoid re-renders during drag
interface DragDropContextValue {
	getDragState: () => DragDropContextData;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function useDragDropContext(): DragDropContextData {
	const context = useContext(DragDropContext);
	if (!context) {
		throw new Error("useDragDropContext must be used within a DragDropProvider");
	}
	return context.getDragState();
}

export { DragDropContext };
export type { DragDropContextData, DragDropContextValue };
