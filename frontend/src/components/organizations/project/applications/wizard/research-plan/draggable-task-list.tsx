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
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { IconButton } from "@/components/app/buttons/icon-button";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
	const updateTasksForObjective = useWizardStore((state) => state.updateTasksForObjective);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleValueChange = useCallback(
		(taskIndex: number, title: string, description: string) => {
			onTaskValueChange?.({ description, number: taskIndex, title });
		},
		[onTaskValueChange],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;

			if (!over || active.id === over.id) {
				return;
			}

			const oldIndex = tasks.findIndex((_, index) => `${objectiveIndex}-task-${index}` === active.id);
			const newIndex = tasks.findIndex((_, index) => `${objectiveIndex}-task-${index}` === over.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				if (onTaskReorder) {
					onTaskReorder(oldIndex, newIndex);
				} else if (objectiveNumber) {
					const reorderedTasks = [...tasks];
					const [movedTask] = reorderedTasks.splice(oldIndex, 1);
					reorderedTasks.splice(newIndex, 0, movedTask);
					await updateTasksForObjective(objectiveNumber, reorderedTasks);
				}
			}
		},
		[tasks, objectiveIndex, onTaskReorder, objectiveNumber, updateTasksForObjective],
	);

	const sortableIds = useMemo(
		() => tasks.map((_, index) => `${objectiveIndex}-task-${index}`),
		[tasks, objectiveIndex],
	);

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
			<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
				<SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
					<div className="space-y-1">
						{tasks.map((task, taskIndex) => (
							<DraggableTaskItem
								isEditing={isEditing}
								key={`${objectiveIndex}-task-${taskIndex}`}
								objectiveIndex={objectiveIndex}
								onTaskDelete={() => onTaskDelete?.(taskIndex)}
								onValueChange={handleValueChange}
								task={task}
								taskIndex={taskIndex}
								totalTasks={tasks.length}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
