"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { IconButton } from "@/components/app/buttons/icon-button";
import AppTextArea from "@/components/app/fields/textarea-field";

interface DraggableTaskItemProps {
	isEditing?: boolean;
	objectiveIndex: number;
	onTaskDelete?: () => void;
	onValueChange?: (taskIndex: number, title: string, description: string) => void;
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
	attributes: ReturnType<typeof useSortable>["attributes"];
	isDragDisabled: boolean;
	isEditing?: boolean;
	listeners: ReturnType<typeof useSortable>["listeners"];
	objectiveIndex: number;
	onTaskDelete?: () => void;
	taskIndex: number;
}

export function DraggableTaskItem({
	isEditing,
	objectiveIndex,
	onTaskDelete,
	onValueChange,
	task,
	taskIndex,
	totalTasks,
}: DraggableTaskItemProps) {
	const taskId = `${objectiveIndex}-task-${taskIndex}`;
	const isDragDisabled = totalTasks <= 1;

	const [localTitle, setLocalTitle] = useState(task.title);
	const [localDescription, setLocalDescription] = useState(task.description ?? "");

	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
		disabled: isDragDisabled,
		id: taskId,
	});

	const handleTitleUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setLocalTitle(e.target.value);
	};

	const handleTitleBlur = () => {
		onValueChange?.(taskIndex, localTitle, localDescription);
	};

	const handleDescriptionUpdate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setLocalDescription(e.target.value);
	};

	const handleDescriptionBlur = () => {
		onValueChange?.(taskIndex, localTitle, localDescription);
	};

	const handleTaskDelete = () => {
		onTaskDelete?.();
	};

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
				onTaskDelete={handleTaskDelete}
				taskIndex={taskIndex}
			/>
			<div className="pt-9.5 px-3 pb-3">
				{isEditing ? (
					<div className="pt-3 space-y-3">
						<AppTextArea
							className="min-h-20"
							id={`task-title-${objectiveIndex}-${taskIndex}`}
							label="Task title"
							onBlur={handleTitleBlur}
							onChange={handleTitleUpdate}
							placeholder="Enter a clear, concise task title"
							value={localTitle}
							variant="field"
						/>
						<AppTextArea
							className="min-h-32"
							id={`task-description-${objectiveIndex}-${taskIndex}`}
							label="Task description"
							onBlur={handleDescriptionBlur}
							onChange={handleDescriptionUpdate}
							placeholder="Describe a step to achieve this objective"
							value={localDescription}
							variant="field"
						/>
					</div>
				) : (
					<div className="space-y-1" data-testid="task-display">
						<div className="text-black text-sm font-semibold leading-none">{task.title}</div>
						{task.description && (
							<div className="text-Grey-600 text-sm leading-none">{task.description}</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
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
