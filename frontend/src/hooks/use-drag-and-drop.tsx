"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type React from "react";
import { useCallback, useState } from "react";

export interface DragDropConfig {
	enableKeyboard?: boolean;
	enablePointer?: boolean;
	strategy?: "horizontal" | "vertical";
}

export interface DragDropHandlers<T extends DragDropItem> {
	onDragEnd?: (event: DragEndEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragOver?: (event: DragOverEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragStart?: (event: DragStartEvent, item: T | undefined) => void;
	onReorder?: (items: T[], oldIndex: number, newIndex: number, activeItem: T, overItem: T) => Promise<void> | void;
}

export interface DragDropItem {
	id: string;
	order: number;
	parent_id?: null | string;
}

export interface DragDropResult<T extends DragDropItem> {
	activeItem: T | undefined;
	DragDropWrapper: React.ComponentType<{
		children: React.ReactNode;
		items: T[];
		renderDragOverlay?: (activeItem: T | undefined) => React.ReactNode;
	}>;
	isItemDragging: (itemId: string) => boolean;
}

export function useDragAndDrop<T extends DragDropItem>(
	handlers: DragDropHandlers<T> = {},
	config: DragDropConfig = {},
): DragDropResult<T> {
	const { onDragEnd, onDragOver, onDragStart, onReorder } = handlers;
	const { enableKeyboard = true, enablePointer = true, strategy = "vertical" } = config;

	const [activeId, setActiveId] = useState<null | string>(null);

	const pointerSensor = useSensor(PointerSensor, {
		activationConstraint: {
			delay: 0,
			distance: 2,
			tolerance: 5,
		},
	});
	const keyboardSensor = useSensor(KeyboardSensor, {
		coordinateGetter: sortableKeyboardCoordinates,
	});

	const sensorArray = [];
	if (enablePointer) {
		sensorArray.push(pointerSensor);
	}
	if (enableKeyboard) {
		sensorArray.push(keyboardSensor);
	}
	const sensors = useSensors(...sensorArray);

	const isItemDragging = useCallback((itemId: string) => activeId === itemId, [activeId]);

	const DragDropWrapper = useCallback(
		function DragDropWrapper({
			children,
			items,
			renderDragOverlay,
		}: {
			children: React.ReactNode;
			items: T[];
			renderDragOverlay?: (activeItem: T | undefined) => React.ReactNode;
		}) {
			const handleDragStart = (event: DragStartEvent) => {
				const draggedItem = items.find((item) => item.id === event.active.id);

				onDragStart?.(event, draggedItem);

				setTimeout(() => {
					setActiveId(event.active.id as string);
				}, 0);
			};

			const handleDragOver = async (event: DragOverEvent) => {
				const { active, over } = event;

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = over ? items.find((item) => item.id === over.id) : undefined;

				await onDragOver?.(event, activeItem, overItem);
			};

			const handleReorder = async (activeItem: T, overItem: T) => {
				if (!onReorder) {
					return;
				}

				const oldIndex = items.findIndex((item) => item.id === activeItem.id);
				const newIndex = items.findIndex((item) => item.id === overItem.id);

				if (oldIndex !== -1 && newIndex !== -1) {
					await onReorder(items, oldIndex, newIndex, activeItem, overItem);
				}
			};

			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex drag-and-drop logic needs to stay cohesive
			const handleDragEnd = async (event: DragEndEvent) => {
				const { active, over } = event;

				setActiveId(null);

				if (!over) {
					return;
				}

				if (active.id === over.id) {
					const activeItem = items.find((item) => item.id === active.id);
					if (onDragEnd) {
						await onDragEnd(event, activeItem, activeItem);
					}
					return;
				}

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = items.find((item) => item.id === over.id);

				if (activeItem && overItem) {
					const shouldReorder = activeItem.id !== overItem.id;

					if (shouldReorder) {
						await handleReorder(activeItem, overItem);
					}
				}

				if (onDragEnd) {
					await onDragEnd(event, activeItem, overItem);
				}
			};

			const activeItem = items.find((item) => item.id === activeId);
			const sortableIds = items.map((item) => item.id);
			const sortingStrategy =
				strategy === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy;

			return (
				<DndContext
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					onDragOver={handleDragOver}
					onDragStart={handleDragStart}
					sensors={sensors}
				>
					<SortableContext items={sortableIds} strategy={sortingStrategy}>
						{children}
					</SortableContext>
					<DragOverlay>{renderDragOverlay ? renderDragOverlay(activeItem) : null}</DragOverlay>
				</DndContext>
			);
		},
		[sensors, onDragStart, onDragOver, onDragEnd, onReorder, activeId, strategy],
	);

	return {
		activeItem: undefined,
		DragDropWrapper,
		isItemDragging,
	};
}
