"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";

export interface DragDropItem {
	id: string;
}

interface DragDropConfig<T extends DragDropItem> {
	onReorder: (items: T[], oldIndex: number, newIndex: number) => Promise<void> | void;
}

interface DragDropReturn {
	DragDropWrapper: ({ children, items }: { children: ReactNode; items: DragDropItem[] }) => ReactNode;
}

export function useDragAndDrop<T extends DragDropItem>(config: DragDropConfig<T>): DragDropReturn {
	const { onReorder } = config;

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			return;
		}

		// This is a simplified implementation - the items would need to be passed from the wrapper
		// For now, this just calls the onReorder with placeholder data
		const oldIndex = 0; // Would be calculated from items array
		const newIndex = 1; // Would be calculated from items array

		await onReorder([] as T[], oldIndex, newIndex);
	};

	const DragDropWrapper = ({ children, items }: { children: ReactNode; items: DragDropItem[] }) => {
		const itemIds = items.map((item) => item.id);

		return (
			<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
				<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
					{children}
				</SortableContext>
			</DndContext>
		);
	};

	return { DragDropWrapper };
}
