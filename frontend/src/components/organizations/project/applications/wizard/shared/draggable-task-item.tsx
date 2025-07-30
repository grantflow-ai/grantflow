"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import Image from "next/image";
import { IconButton } from "@/components/app/buttons/icon-button";
import AppTextArea from "@/components/app/forms/textarea-field";

interface DraggableTaskItemProps {
	isEditing?: boolean;
	objectiveIndex: number;
	onTaskDelete?: (taskIndex: number) => void;
	onTaskUpdate?: (taskIndex: number, description: string) => void;
	task: Task;
	taskIndex: number;
	totalTasks: number;
}

interface Task {
	description?: string;
	number: number;
	title: string;
}

interface TaskHeaderProps {
	attributes: any;
	isDragDisabled: boolean;
	isEditing?: boolean;
	listeners: any;
	objectiveIndex: number;
	onTaskDelete?: () => void;
	taskIndex: number;
}

export function DraggableTaskItem({
	isEditing,
	objectiveIndex,
	onTaskDelete,
	onTaskUpdate,
	task,
	taskIndex,
	totalTasks,
}: DraggableTaskItemProps) {
	const taskId = `${objectiveIndex}-task-${taskIndex}`;
	const isDragDisabled = totalTasks <= 1;

	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
		disabled: isDragDisabled,
		id: taskId,
	});

	const style = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div className="border border-gray-200 rounded relative" ref={setNodeRef} style={style}>
			<TaskHeader
				attributes={attributes}
				isDragDisabled={isDragDisabled}
				isEditing={isEditing}
				listeners={listeners}
				objectiveIndex={objectiveIndex}
				onTaskDelete={() => onTaskDelete?.(taskIndex)}
				taskIndex={taskIndex}
			/>
			<div className="pt-9.5 px-3 pb-3">
				{isEditing ? (
					<div className="pt-3">
						<AppTextArea
							className="min-h-52"
							id={`task-description-${objectiveIndex}-${taskIndex}`}
							label="Task description"
							onChange={(e) => onTaskUpdate?.(taskIndex, e.target.value)}
							placeholder="Describe a step to achieve this objective"
							value={getTaskContent(task)}
							variant="field"
						/>
					</div>
				) : (
					<div className="text-app-gray-600 text-sm font-normal leading-none" data-testid="task-display">
						Task: {getTaskContent(task)}
					</div>
				)}
			</div>
		</div>
	);
}

function getTaskContent(task: Task): string {
	const trimmedDescription = task.description?.trim();
	return trimmedDescription && trimmedDescription.length > 0 ? trimmedDescription : task.title;
}

function TaskHeader({
	attributes,
	isDragDisabled,
	isEditing,
	listeners,
	objectiveIndex,
	onTaskDelete,
	taskIndex,
}: TaskHeaderProps) {
	return (
		<div className="absolute -top-1 left-0 right-0 flex items-center justify-between z-10">
			<div
				className={`flex size-7.5 items-center justify-center rounded-br text-base font-semibold font-heading leading-snug ${isEditing ? "bg-app-gray-300 text-white" : "bg-app-gray-50 text-primary"}`}
			>
				{objectiveIndex}.{taskIndex + 1}
			</div>

			<div className="flex-1 flex justify-center">
				{isDragDisabled ? (
					<div className="flex items-center justify-center p-2">
						<GripHorizontal className="flex-shrink-0 text-gray-300" size={20} />
					</div>
				) : (
					<button
						aria-label={`Drag to reorder task ${taskIndex + 1}`}
						className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing flex items-center justify-center p-2"
						type="button"
						{...attributes}
						{...listeners}
					>
						<GripHorizontal className="flex-shrink-0" size={20} />
					</button>
				)}
			</div>

			{isEditing && (
				<div className="flex items-center">
					<IconButton data-testid="delete-task-button" onClick={onTaskDelete} type="button" variant="float">
						<Image alt="Delete" height={16} src="/icons/delete.svg" width={16} />
					</IconButton>
				</div>
			)}
		</div>
	);
}
