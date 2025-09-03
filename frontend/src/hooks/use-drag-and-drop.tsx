"use client";

import {
	type CollisionDetection,
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
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
import { useCallback } from "react";
import { useDragOverlayStore } from "../stores/drag-overlay-store";

export interface DragDropConfig {
	collisionDetection?: CollisionDetection;
	enableKeyboard?: boolean;
	enablePointer?: boolean;
	strategy?: "horizontal" | "vertical";
}

export interface DragDropHandlers<T extends DragDropItem> {
	onDragEnd?: (event: DragEndEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragMove?: (event: DragMoveEvent) => void;
	onDragOver?: (event: DragOverEvent, activeItem: T | undefined, overItem: T | undefined) => Promise<void> | void;
	onDragStart?: (event: DragStartEvent, item: T | undefined) => void;
	onReorder?: (
		items: T[],
		activeIndex: number,
		overIndex: number,
		activeItem: T,
		overItem: T,
	) => Promise<void> | void;
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
}

export function useDragAndDrop<T extends DragDropItem>(
	handlers: DragDropHandlers<T> = {},
	config: DragDropConfig = {},
): DragDropResult<T> {
	const { onDragEnd, onDragMove, onDragOver, onDragStart, onReorder } = handlers;
	const {
		collisionDetection = closestCenter,
		enableKeyboard = true,
		enablePointer = true,
		strategy = "vertical",
	} = config;

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

				useDragOverlayStore.getState().setActiveItem(draggedItem);
			};

			const handleDragOver = async (event: DragOverEvent) => {
				const { active, over } = event;

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = over ? items.find((item) => item.id === over.id) : undefined;

				await onDragOver?.(event, activeItem, overItem);
			};

			const handleDragMove = (event: DragMoveEvent) => {
				onDragMove?.(event);
			};

			const handleReorder = async (activeItem: T, overItem: T) => {
				if (!onReorder) {
					return;
				}

				const activeIndex = items.findIndex((item) => item.id === activeItem.id);
				const overIndex = items.findIndex((item) => item.id === overItem.id);

				if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
					await onReorder(items, activeIndex, overIndex, activeItem, overItem);
				}
			};

			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex drag-and-drop logic needs to stay cohesive
			const handleDragEnd = async (event: DragEndEvent) => {
				const { active, over } = event;

				useDragOverlayStore.getState().clearActiveItem();

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

			const sortableIds = items.map((item) => item.id);
			const sortingStrategy =
				strategy === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy;

			return (
				<DndContext
					collisionDetection={collisionDetection}
					onDragEnd={handleDragEnd}
					onDragMove={handleDragMove}
					onDragOver={handleDragOver}
					onDragStart={handleDragStart}
					sensors={sensors}
				>
					<SortableContext items={sortableIds} strategy={sortingStrategy}>
						{children}
					</SortableContext>
					<CustomDragOverlay renderOverlay={renderDragOverlay} />
				</DndContext>
			);

			function CustomDragOverlay({
				renderOverlay,
			}: {
				renderOverlay?: (activeItem: T | undefined) => React.ReactNode;
			}) {
				const { activeItem } = useDragOverlayStore();

				return <DragOverlay>{renderOverlay ? renderOverlay(activeItem as T) : null}</DragOverlay>;
			}
		},
		[sensors, onDragStart, onDragOver, onDragMove, onDragEnd, onReorder, strategy, collisionDetection],
	);

	return {
		activeItem: undefined,
		DragDropWrapper,
	};
}
