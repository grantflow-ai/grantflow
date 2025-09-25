"use client";

import { type DragDropItem, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import type { ResearchObjective } from "@/stores/wizard-store";
import { DraggableObjectiveCard } from "./draggable-objective-card";

interface ObjectiveDragDropItem extends DragDropItem {
	number: number;
}

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
	const dragDropItems: ObjectiveDragDropItem[] = objectives.map((obj) => ({
		id: String(obj.number),
		number: obj.number,
		order: obj.number,
		parent_id: null,
	}));

	const { DragDropWrapper } = useDragAndDrop<ObjectiveDragDropItem>({
		onReorder: async (_items, oldIndex, newIndex) => {
			await onReorder(objectives, oldIndex, newIndex);
		},
	});

	const editingIndex = editingObjectiveId
		? objectives.findIndex((obj) => obj.number === editingObjectiveId)
		: undefined;

	return (
		<DragDropWrapper items={dragDropItems}>
			<div
				className={`grid gap-4 ${getGridCols(objectives.length, editingIndex)}`}
				style={getGridStyle(objectives.length, editingIndex)}
			>
				{objectives.map((objective, index) => (
					<div
						className={objectives.length === 1 ? "col-start-1" : ""}
						key={`${objective.title}-${objective.description}-${index}`}
					>
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
		</DragDropWrapper>
	);
}
