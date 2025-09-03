import { create } from "zustand";

export interface DragDropItem {
	id: string;
	order: number;
	parent_id?: null | string;
}

interface DragOverlayState {
	activeItem: DragDropItem | undefined;
	clearActiveItem: () => void;
	setActiveItem: (item: DragDropItem | undefined) => void;
}

export const useDragOverlayStore = create<DragOverlayState>((set) => ({
	activeItem: undefined,
	clearActiveItem: () => {
		set({ activeItem: undefined });
	},
	setActiveItem: (item) => {
		set({ activeItem: item });
	},
}));
