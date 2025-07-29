"use client";

import { Edit, GripHorizontal, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { IconButton } from "@/components/app/buttons/icon-button";
import AppTextArea from "@/components/app/forms/textarea-field";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Objective } from "@/stores/wizard-store";

interface EditableObjectiveProps {
	index: number;
	objective: Objective;
	onCancel: () => void;
	onSave: (updatedObjective: Objective) => void;
}

interface ObjectiveCardContentProps {
	index: number;
	objective: Objective;
}

interface ObjectiveHeaderProps {
	attributes: any;
	index: number;
	isEditing: boolean;
	listeners: any;
	objective: Objective;
	objectivesCount: number;
	onCancel: () => void;
	onEdit: () => void;
	onRemove: () => void;
}

interface TaskContentProps {
	isEditing?: boolean;
	objectiveIndex: number;
	onTaskAdd?: () => void;
	onTaskDelete?: (taskIndex: number) => void;
	onTaskUpdate?: (taskIndex: number, description: string) => void;
	tasks: { description?: string; number: number; title: string }[];
}

interface TaskHeaderProps {
	isEditing?: boolean;
	objectiveIndex: number;
	onTaskDelete?: () => void;
	taskIndex: number;
	totalTasks: number;
}

export function EditableObjective({ index, objective, onCancel: _onCancel, onSave }: EditableObjectiveProps) {
	const [title, setTitle] = useState(objective.title);
	const [description, setDescription] = useState(objective.description);
	const [tasks, setTasks] = useState(objective.research_tasks);

	const handleTaskUpdate = (taskIndex: number, taskDescription: string) => {
		setTasks((prevTasks) =>
			prevTasks.map((task, idx) => (idx === taskIndex ? { ...task, description: taskDescription } : task)),
		);
	};

	const handleTaskDelete = (taskIndex: number) => {
		setTasks((prevTasks) => prevTasks.filter((_, idx) => idx !== taskIndex));
	};

	const handleTaskAdd = () => {
		setTasks((prevTasks) => [
			...prevTasks,
			{
				description: "",
				number: prevTasks.length + 1,
				title: "",
			},
		]);
	};

	const handleSave = () => {
		onSave({
			...objective,
			description,
			research_tasks: tasks,
			title,
		});
	};

	return (
		<div className="space-y-3 px-3 pb-3 pt-15">
			<div className="flex justify-between items-center">
				<div className="font-semibold font-['Cabin'] leading-snug" data-testid="edit-objective-title">
					Edit Objective
				</div>
				<AppButton data-testid="save-changes-button" onClick={handleSave} type="button" variant="primary">
					Save Changes
				</AppButton>
			</div>
			<AppTextArea
				className="min-h-32"
				id={`objective-title-${index}`}
				label="Objective name"
				onChange={(e) => {
					setTitle(e.target.value);
				}}
				placeholder="Enter a clear, measurable objective"
				value={title}
				variant="field"
			/>
			<AppTextArea
				className="min-h-52"
				id={`objective-description-${index}`}
				label="Objective description"
				onChange={(e) => {
					setDescription(e.target.value);
				}}
				placeholder="Describe how this objective supports the grant's goals"
				value={description}
				variant="field"
			/>
			<TaskContent
				isEditing={true}
				objectiveIndex={index}
				onTaskAdd={handleTaskAdd}
				onTaskDelete={handleTaskDelete}
				onTaskUpdate={handleTaskUpdate}
				tasks={tasks}
			/>
		</div>
	);
}

export function ObjectiveCardContent({ index, objective }: ObjectiveCardContentProps) {
	return (
		<div className="space-y-2 px-3 pb-3 pt-15">
			<h4 className="text-app-black font-semibold font-heading leading-snug">{objective.title}</h4>
			<p className="text-Grey-600 text-sm leading-none">{objective.description}</p>
			<TaskContent objectiveIndex={index} tasks={objective.research_tasks} />
		</div>
	);
}

export function ObjectiveHeader({
	attributes,
	index,
	isEditing,
	listeners,
	objective,
	objectivesCount,
	onCancel,
	onEdit,
	onRemove,
}: ObjectiveHeaderProps) {
	const isDragDisabled = objectivesCount <= 1;

	return (
		<div className="absolute -top-0.5 -left-0.5 right-0 flex items-start justify-between z-10">
			<div
				className={`flex size-10 items-center justify-center rounded rounded-bl-none rounded-tr-none text-2xl font-medium font-heading leading-loose ${isEditing ? "bg-app-gray-300 text-white" : "bg-primary text-white"}`}
			>
				{index}
			</div>

			<div className="flex-1 flex justify-center">
				{isDragDisabled ? (
					<div className="flex items-center justify-center p-2">
						<GripHorizontal className="flex-shrink-0 text-gray-300" size={20} />
					</div>
				) : (
					<button
						aria-label={`Drag to reorder objective ${index}: ${objective.title}`}
						className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing flex items-center justify-center p-2"
						type="button"
						{...attributes}
						{...listeners}
					>
						<GripHorizontal className="flex-shrink-0" size={20} />
					</button>
				)}
			</div>

			<div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							className="inline-flex items-center justify-center size-8 text-gray-400 cursor-pointer hover:text-gray-600 focus:outline-none"
							data-testid="menu-trigger"
							type="button"
						>
							<Image alt="Menu" height={16} src="/icons/three-dots.svg" width={16} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem data-testid="edit-task-menuitem" onClick={isEditing ? onCancel : onEdit}>
							<Edit className="mr-2 size-4" />
							{isEditing ? "Cancel Editing" : "Edit Objective"}
						</DropdownMenuItem>
						<DropdownMenuItem data-testid="remove-menuitem" onClick={onRemove}>
							<Trash2 className="mr-2 size-4" />
							Remove
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

function getTaskContent(task: { description?: string; title: string }): string {
	const trimmedDescription = task.description?.trim();
	return trimmedDescription && trimmedDescription.length > 0 ? trimmedDescription : task.title;
}

function TaskContent({ isEditing, objectiveIndex, onTaskAdd, onTaskDelete, onTaskUpdate, tasks }: TaskContentProps) {
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
			<div className="space-y-1">
				{tasks.map((task, taskIndex) => (
					<div className="border border-gray-200 rounded relative" key={taskIndex}>
						<TaskHeader
							isEditing={isEditing}
							objectiveIndex={objectiveIndex}
							onTaskDelete={() => onTaskDelete?.(taskIndex)}
							taskIndex={taskIndex}
							totalTasks={tasks.length}
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
								<div
									className="text-app-gray-600 text-sm font-normal leading-none"
									data-testid="task-display"
								>
									Task: {getTaskContent(task)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function TaskHeader({ isEditing, objectiveIndex, onTaskDelete, taskIndex, totalTasks }: TaskHeaderProps) {
	const isDragDisabled = totalTasks <= 1;

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
