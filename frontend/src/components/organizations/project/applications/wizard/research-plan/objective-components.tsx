"use client";

import type { useSortable } from "@dnd-kit/sortable";
import { Edit, GripHorizontal, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import AppTextArea from "@/components/app/fields/textarea-field";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResearchObjective } from "@/stores/wizard-store";
import { DraggableTaskList } from "./draggable-task-list";

interface EditableObjectiveProps {
	index: number;
	objective: ResearchObjective;
	onCancel: () => void;
	onSave: (updatedObjective: ResearchObjective) => void;
}

interface ObjectiveCardContentProps {
	index: number;
	objective: ResearchObjective;
}

interface ObjectiveHeaderProps {
	attributes: ReturnType<typeof useSortable>["attributes"];
	index: number;
	isEditing: boolean;
	listeners: ReturnType<typeof useSortable>["listeners"];
	objective: ResearchObjective;
	objectivesCount: number;
	onCancel: () => void;
	onEdit: () => void;
	onRemove: () => void;
}

export function EditableObjective({ index, objective, onCancel: _onCancel, onSave }: EditableObjectiveProps) {
	const [title, setTitle] = useState(objective.title);
	const [description, setDescription] = useState(objective.description);
	const [tasks, setTasks] = useState<ResearchObjective["research_tasks"]>(objective.research_tasks);

	const taskValues: Record<number, string> = {};

	const handleTaskValuesChange = (newTaskValues: Record<number, string>) => {
		Object.assign(taskValues, newTaskValues);
	};

	const handleTaskDelete = (taskIndex: number) => {
		setTasks((prevTasks: ResearchObjective["research_tasks"]) => prevTasks.filter((_, idx) => idx !== taskIndex));
	};

	const handleTaskAdd = () => {
		setTasks((prevTasks: ResearchObjective["research_tasks"]) => [
			...prevTasks,
			{
				description: "",
				number: prevTasks.length + 1,
				title: "",
			},
		]);
	};

	const handleTaskReorder = (oldIndex: number, newIndex: number) => {
		setTasks((prevTasks: ResearchObjective["research_tasks"]) => {
			const reorderedTasks = [...prevTasks];
			const [movedTask] = reorderedTasks.splice(oldIndex, 1);
			reorderedTasks.splice(newIndex, 0, movedTask);

			return reorderedTasks.map((task, index) => ({
				...task,
				number: index + 1,
			}));
		});
	};

	const handleSave = () => {
		const updatedTasks = tasks.map((task: ResearchObjective["research_tasks"][0], index: number) => ({
			...task,
			description: taskValues[index] ?? task.description,
		}));

		onSave({
			...objective,
			description,
			research_tasks: updatedTasks,
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
			<DraggableTaskList
				isEditing={true}
				objectiveIndex={index}
				onTaskAdd={handleTaskAdd}
				onTaskDelete={handleTaskDelete}
				onTaskReorder={handleTaskReorder}
				onTaskValuesChange={handleTaskValuesChange}
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
			<DraggableTaskList
				objectiveIndex={index}
				objectiveNumber={objective.number}
				tasks={objective.research_tasks}
			/>
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
