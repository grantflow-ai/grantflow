"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Plus } from "lucide-react";
import { useCallback } from "react";
import { IconButton } from "@/components/app/buttons/icon-button";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type DragDropItem, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { type ResearchObjective, useWizardStore } from "@/stores/wizard-store";
import { DraggableTaskItem } from "./draggable-task-item";

interface DraggableTaskListProps {
	isEditing?: boolean;
	objectiveIndex: number;
	objectiveNumber?: number;
	onTaskAdd?: () => void;
	onTaskDelete?: (taskIndex: number) => void;
	onTaskReorder?: (oldIndex: number, newIndex: number) => void;
	onTaskValueChange?: (taskValue: ResearchObjective["research_tasks"][0]) => void;
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
	onTaskValueChange,
	tasks,
}: DraggableTaskListProps) {
	const dragDropItems: TaskDragDropItem[] = tasks.map((_, index) => ({
		id: `${objectiveIndex}-task-${index}`,
		order: index,
		parent_id: String(objectiveIndex),
		taskIndex: index,
	}));

	const updateTasksForObjective = useWizardStore((state) => state.updateTasksForObjective);

	const handleValueChange = useCallback(
		(taskIndex: number, title: string, description: string) => {
			onTaskValueChange?.({ description, number: taskIndex, title });
		},
		[onTaskValueChange],
	);

	const { DragDropWrapper } = useDragAndDrop<TaskDragDropItem>({
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
	});

	return (
		<div className="space-y-3">
			{(tasks.length > 0 || isEditing) && (
				<div className={isEditing ? "flex items-center justify-between" : ""}>
					<div className="text-app-black font-semibold font-heading leading-snug" data-testid="tasks-section">
						Tasks
					</div>
					{isEditing && (
						<TooltipProvider delayDuration={300}>
							<TooltipPrimitive.Root>
								<TooltipTrigger asChild>
									<IconButton
										data-testid="add-task-button"
										onClick={onTaskAdd}
										size="sm"
										type="button"
										variant="solid"
									>
										<Plus className="w-4 h-4" />
									</IconButton>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>Add Task</p>
								</TooltipContent>
							</TooltipPrimitive.Root>
						</TooltipProvider>
					)}
				</div>
			)}
			<DragDropWrapper items={dragDropItems}>
				<div className="space-y-1">
					{tasks.map((task, taskIndex) => (
						<DraggableTaskItem
							isEditing={isEditing}
							key={`objective-${objectiveIndex}-task-${taskIndex + 1}`}
							objectiveIndex={objectiveIndex}
							onTaskDelete={() => onTaskDelete?.(taskIndex)}
							onValueChange={handleValueChange}
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
