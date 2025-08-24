"use client";

import { Plus } from "lucide-react";
import { IconButton } from "@/components/app/buttons/icon-button";
import { type DragDropItem, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useWizardStore } from "@/stores/wizard-store";
import { DraggableTaskItem } from "./draggable-task-item";

interface DraggableTaskListProps {
	isEditing?: boolean;
	objectiveIndex: number;
	objectiveNumber?: number;
	onTaskAdd?: () => void;
	onTaskDelete?: (taskIndex: number) => void;
	onTaskReorder?: (oldIndex: number, newIndex: number) => void;
	onTaskValuesChange?: (taskValues: Record<number, string>) => void;
	tasks: Task[];
}

interface Task {
	description?: string;
	number: number;
	title: string;
}

interface TaskDragDropItem extends DragDropItem {
	taskIndex: number;
}

export function DraggableTaskList({
	isEditing,
	objectiveIndex,
	objectiveNumber,
	onTaskAdd,
	onTaskDelete,
	onTaskReorder,
	onTaskValuesChange,
	tasks,
}: DraggableTaskListProps) {
	const dragDropItems: TaskDragDropItem[] = tasks.map((_, index) => ({
		id: `${objectiveIndex}-task-${index}`,
		order: index,
		parent_id: String(objectiveIndex),
		taskIndex: index,
	}));

	const updateTasksForObjective = useWizardStore((state) => state.updateTasksForObjective);

	const { DragDropWrapper } = useDragAndDrop<TaskDragDropItem>(
		{
			onReorder: async (_items, oldIndex, newIndex) => {
				if (onTaskReorder) {
					onTaskReorder(oldIndex, newIndex);
				} else if (objectiveNumber) {
					const reorderedTasks = [...tasks];
					const [movedTask] = reorderedTasks.splice(oldIndex, 1);
					reorderedTasks.splice(newIndex, 0, movedTask);
					await updateTasksForObjective(objectiveNumber, reorderedTasks);
				}
			},
		},
		{
			strategy: "vertical",
		},
	);

	return (
		<div className="space-y-3">
			<div className={isEditing ? "flex items-center justify-between" : ""}>
				<div className="text-app-black font-semibold font-heading leading-snug" data-testid="tasks-section">
					Tasks
				</div>
				{isEditing && (
					<IconButton
						data-testid="add-task-button"
						onClick={onTaskAdd}
						size="sm"
						type="button"
						variant="solid"
					>
						<Plus className="w-4 h-4" />
					</IconButton>
				)}
			</div>
			<DragDropWrapper items={dragDropItems}>
				<div className="space-y-1">
					{tasks.map((task, taskIndex) => (
						<DraggableTaskItem
							isEditing={isEditing}
							key={`task-${task.number}-${objectiveIndex}`}
							objectiveIndex={objectiveIndex}
							onTaskDelete={() => onTaskDelete?.(taskIndex)}
							onValueChange={(taskIndex, value) => {
								const taskValues: Record<number, string> = {};
								taskValues[taskIndex] = value;
								onTaskValuesChange?.(taskValues);
							}}
							task={task}
							taskIndex={taskIndex}
							totalTasks={tasks.length}
						/>
					))}
				</div>
			</DragDropWrapper>
		</div>
	);
}
