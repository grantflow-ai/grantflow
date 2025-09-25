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
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useMemo } from "react";
import type { ResearchObjective } from "@/stores/wizard-store";
import { DraggableObjectiveCard } from "./draggable-objective-card";

interface ObjectiveListProps {
	editingObjectiveId: null | number;
	objectives: ResearchObjective[];
	onEdit: (objectiveNumber: number) => void;
	onRemove: (objective: ResearchObjective) => void;
	onReorder: (objectives: ResearchObjective[], oldIndex: number, newIndex: number) => Promise<void>;
	onSave: (objective: ResearchObjective) => Promise<void>;
	setEditingObjectiveId: (id: null | number) => void;
}

const getGridCols = (count: number, editingIndex?: number): string => {
	if (count >= 4 && editingIndex !== undefined) {
		return "";
	}

	const gridColsMap: Record<number, string> = {
		1: "grid-cols-2",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "grid-cols-5",
	};

	return gridColsMap[count] ?? "grid-cols-5";
};

const getGridStyle = (count: number, editingIndex?: number): React.CSSProperties => {
	if (count >= 4 && editingIndex !== undefined) {
		const columns = Array.from({ length: count }, (_, index) => {
			return index === editingIndex ? "1.4fr" : "0.9fr";
		});

		return {
			display: "grid",
			gap: "1rem",
			gridTemplateColumns: columns.join(" "),
			transition: "grid-template-columns 0.3s ease-in-out",
		};
	}

	if (count > 5) {
		return {
			display: "grid",
			gap: "1rem",
			gridTemplateColumns: `repeat(${Math.min(count, 6)}, minmax(0, 1fr))`,
		};
	}
	return {};
};

export function ObjectiveList({
	editingObjectiveId,
	objectives,
	onEdit,
	onRemove,
	onReorder,
	onSave,
	setEditingObjectiveId,
}: ObjectiveListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;

			if (!over || active.id === over.id) {
				return;
			}

			const oldIndex = objectives.findIndex((obj) => String(obj.number) === active.id);
			const newIndex = objectives.findIndex((obj) => String(obj.number) === over.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				await onReorder(objectives, oldIndex, newIndex);
			}
		},
		[objectives, onReorder],
	);

	const editingIndex = useMemo(
		() =>
			editingObjectiveId === null ? undefined : objectives.findIndex((obj) => obj.number === editingObjectiveId),
		[editingObjectiveId, objectives],
	);

	const sortableIds = useMemo(() => objectives.map((obj) => String(obj.number)), [objectives]);

	const gridCols = useMemo(() => getGridCols(objectives.length, editingIndex), [objectives.length, editingIndex]);

	const gridStyle = useMemo(() => getGridStyle(objectives.length, editingIndex), [objectives.length, editingIndex]);

	return (
		<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
			<SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
				<div className={`grid gap-4 ${gridCols}`} style={gridStyle}>
					{objectives.map((objective, index) => (
						<div className={objectives.length === 1 ? "col-start-1" : ""} key={objective.number}>
							<DraggableObjectiveCard
								index={index + 1}
								isEditing={editingObjectiveId === objective.number}
								objective={objective}
								objectivesCount={objectives.length}
								onCancel={() => {
									setEditingObjectiveId(null);
								}}
								onEdit={() => {
									onEdit(objective.number);
								}}
								onRemove={() => {
									onRemove(objective);
								}}
								onSave={onSave}
							/>
						</div>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
