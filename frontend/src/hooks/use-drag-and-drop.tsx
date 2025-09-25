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
	TouchSensor,
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
import { useEffect, useMemo } from "react";
import { useDragOverlayStore } from "@/stores/drag-overlay-store";
import { log } from "@/utils/logger/client";

export interface DragDropConfig {
	collisionDetection?: CollisionDetection;
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
	const { collisionDetection = closestCenter, strategy = "vertical" } = config;

	useEffect(() => {
		log.info("[useDragAndDrop] Hook mounted", {
			hasOnDragEnd: !!onDragEnd,
			hasOnDragMove: !!onDragMove,
			hasOnDragOver: !!onDragOver,
			hasOnDragStart: !!onDragStart,
			hasOnReorder: !!onReorder,
			strategy,
		});
	}, [onDragEnd, onDragMove, onDragOver, onDragStart, onReorder, strategy]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				delay: 100,
				distance: 8,
				tolerance: 20,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 100,
				tolerance: 20,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Memoize the component to prevent recreation on every render
	const DragDropWrapper = useMemo(() => {
		return function DragDropWrapperComponent({
			children,
			items,
			renderDragOverlay,
		}: {
			children: React.ReactNode;
			items: T[];
			renderDragOverlay?: (activeItem: T | undefined) => React.ReactNode;
		}) {
			const handleDragStart = (event: DragStartEvent) => {
				log.info("[DragDropWrapper] Drag start event", {
					activeId: event.active.id,
				});

				const draggedItem = items.find((item) => item.id === event.active.id);
				log.info("[DragDropWrapper] Found dragged item", {
					found: !!draggedItem,
					itemId: draggedItem?.id,
				});

				onDragStart?.(event, draggedItem);
				useDragOverlayStore.getState().setActiveItem(draggedItem);
			};

			const handleDragOver = async (event: DragOverEvent) => {
				const { active, over } = event;

				log.info("[DragDropWrapper] Drag over event", {
					activeId: active.id,
					overId: over?.id,
				});

				const activeItem = items.find((item) => item.id === active.id);
				const overItem = over ? items.find((item) => item.id === over.id) : undefined;

				await onDragOver?.(event, activeItem, overItem);
			};

			const handleDragMove = (event: DragMoveEvent) => {
				log.info("[DragDropWrapper] Drag move event", {
					activeId: event.active?.id,
					collisionCount: event.collisions?.length ?? 0,
				});
				onDragMove?.(event);
			};

			const handleReorder = async (activeItem: T, overItem: T) => {
				if (!onReorder) {
					log.info("[DragDropWrapper] No onReorder handler, skipping reorder");
					return;
				}

				const activeIndex = items.findIndex((item) => item.id === activeItem.id);
				const overIndex = items.findIndex((item) => item.id === overItem.id);

				log.info("[DragDropWrapper] Reordering", {
					activeId: activeItem.id,
					activeIndex,
					overId: overItem.id,
					overIndex,
				});

				if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
					await onReorder(items, activeIndex, overIndex, activeItem, overItem);
				} else {
					log.warn("[DragDropWrapper] Invalid indices for reorder", {
						activeIndex,
						overIndex,
					});
				}
			};

			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex drag-and-drop logic needs to stay cohesive
			const handleDragEnd = async (event: DragEndEvent) => {
				const { active, over } = event;

				log.info("[DragDropWrapper] Drag end event", {
					activeId: active.id,
					overId: over?.id,
				});

				useDragOverlayStore.getState().clearActiveItem();

				if (!over) {
					log.info("[DragDropWrapper] Drag end with no over item, returning");
					return;
				}

				if (active.id === over.id) {
					log.info("[DragDropWrapper] Active and over items are the same, no reorder");
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
					log.info("[DragDropWrapper] Checking reorder", {
						activeItem: activeItem.id,
						overItem: overItem.id,
						shouldReorder,
					});

					if (shouldReorder) {
						await handleReorder(activeItem, overItem);
					}
				} else {
					log.warn("[DragDropWrapper] Missing active or over item", {
						activeItem: !!activeItem,
						overItem: !!overItem,
					});
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
		};
	}, [sensors, onDragStart, onDragOver, onDragMove, onDragEnd, onReorder, strategy, collisionDetection]);

	return {
		activeItem: undefined,
		DragDropWrapper,
	};
}
