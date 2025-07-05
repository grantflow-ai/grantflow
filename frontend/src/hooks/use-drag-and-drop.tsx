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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type React from "react";
import { useCallback, useState } from "react";
import { log } from "@/utils/logger";

export interface DragDropConfig {
	enableKeyboard?: boolean;
	enablePointer?: boolean;
}

export interface DragDropHandlers<T extends DragDropItem> {
	onDragEnd?: (event: DragEndEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragOver?: (event: DragOverEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragStart?: (event: DragStartEvent, item: T | undefined) => void;
	onReorder?: (items: T[], oldIndex: number, newIndex: number) => Promise<void> | void;
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
	const { enableKeyboard = true, enablePointer = true } = config;

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
				log.info("useDragAndDrop: handleDragStart", { activeId: event.active.id });
				const draggedItem = items.find((item) => item.id === event.active.id);
				setActiveId(event.active.id as string);
				onDragStart?.(event, draggedItem);
			};

			const handleDragOver = async (event: DragOverEvent) => {
				const { active, over } = event;

				if (!over || active.id === over.id) {
					return;
				}

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = items.find((item) => item.id === over.id);

				if (onDragOver) {
					await onDragOver(event, activeItem, overItem);
				}
			};

			const handleReorder = async (activeItem: T, overItem: T) => {
				if (!onReorder) {
					log.warn("useDragAndDrop: No onReorder handler provided");
					return;
				}

				const oldIndex = items.findIndex((item) => item.id === activeItem.id);
				const newIndex = items.findIndex((item) => item.id === overItem.id);

				log.info("useDragAndDrop: handleReorder", {
					activeId: activeItem.id,
					newIndex,
					oldIndex,
					overId: overItem.id,
				});

				if (oldIndex !== -1 && newIndex !== -1) {
					await onReorder(items, oldIndex, newIndex);
				}
			};

			const handleDragEnd = async (event: DragEndEvent) => {
				const { active, over } = event;
				log.info("useDragAndDrop: handleDragEnd", {
					activeId: active.id,
					hasOver: !!over,
					overId: over?.id,
					sameItem: active.id === over?.id,
				});
				setActiveId(null);

				if (!over || active.id === over.id) {
					log.info("useDragAndDrop: Drag ended without change");
					return;
				}

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = items.find((item) => item.id === over.id);

				if (activeItem && overItem) {
					log.info("useDragAndDrop: Calling handleReorder");
					await handleReorder(activeItem, overItem);
				} else {
					log.warn("useDragAndDrop: Could not find items", {
						activeFound: !!activeItem,
						itemCount: items.length,
						overFound: !!overItem,
					});
				}

				if (onDragEnd) {
					log.info("useDragAndDrop: Calling onDragEnd handler");
					await onDragEnd(event, activeItem, overItem);
				}
			};

			const activeItem = items.find((item) => item.id === activeId);
			const sortableIds = items.map((item) => item.id);

			if (activeId) {
				log.info("DragDropWrapper: Active drag", { activeId, hasActiveItem: !!activeItem });
			}

			return (
				<DndContext
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					onDragOver={handleDragOver}
					onDragStart={handleDragStart}
					sensors={sensors}
				>
					<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
						{children}
					</SortableContext>
					<DragOverlay>{renderDragOverlay ? renderDragOverlay(activeItem) : null}</DragOverlay>
				</DndContext>
			);
		},
		[sensors, onDragStart, onDragOver, onDragEnd, onReorder, activeId],
	);

	return {
		activeItem: undefined,
		DragDropWrapper,
		isItemDragging,
	};
}
