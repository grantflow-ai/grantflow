"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripHorizontal, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { IconButton } from "@/components/app/buttons/icon-button";
import AppTextArea from "@/components/app/forms/textarea-field";
import { WizardRightPane } from "@/components/projects/wizard/shared";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useApplicationStore } from "@/stores/application-store";
import { type Objective, useWizardStore } from "@/stores/wizard-store";
import { log } from "@/utils/logger";

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
	onCancel: () => void;
	onEdit: () => void;
	onRemove: () => void;
}

interface SortableObjectiveCardProps {
	id: number;
	index: number;
	isEditing: boolean;
	objective: Objective;
	onCancel: () => void;
	onEdit: () => void;
	onRemove: () => void;
	onSave: (updatedObjective: Objective) => void;
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
}

const getGridClasses = (count: number) => {
	if (count === 1 || count === 2) return "grid grid-cols-2 gap-4";
	return `grid grid-cols-${count} gap-4`;
};

export function ResearchPlanPreview() {
	const objectives = useApplicationStore((state) => state.application?.research_objectives) ?? [];
	const handleObjectiveDragEnd = useWizardStore((state) => state.handleObjectiveDragEnd);
	const removeObjective = useWizardStore((state) => state.removeObjective);
	const [editingObjectiveId, setEditingObjectiveId] = useState<null | number>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [objectiveToDelete, setObjectiveToDelete] = useState<null | Objective>(null);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleRemoveClick = (objective: Objective) => {
		setObjectiveToDelete(objective);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		if (objectiveToDelete) {
			removeObjective(objectiveToDelete.number);
			setDeleteDialogOpen(false);
			setObjectiveToDelete(null);
		}
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setObjectiveToDelete(null);
	};

	if (objectives.length === 0) {
		return (
			<WizardRightPane padding="p-6">
				<div className="flex h-full flex-col" data-testid="empty-state">
					<EmptyStatePreview />
				</div>
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="p-6">
			<div className="flex-1">
				<DndContext collisionDetection={closestCenter} onDragEnd={handleObjectiveDragEnd} sensors={sensors}>
					<SortableContext
						items={objectives.map((obj) => obj.number)}
						strategy={horizontalListSortingStrategy}
					>
						<div className={getGridClasses(objectives.length)}>
							{objectives.map((objective, index) => (
								<div
									className={objectives.length === 1 ? "col-start-1" : ""}
									key={`${objective.title}-${objective.description}-${index}`}
								>
									<SortableObjectiveCard
										id={objective.number}
										index={index + 1}
										isEditing={editingObjectiveId === objective.number}
										objective={objective}
										onCancel={() => {
											setEditingObjectiveId(null);
										}}
										onEdit={() => {
											setEditingObjectiveId(objective.number);
										}}
										onRemove={() => {
											handleRemoveClick(objective);
										}}
										onSave={(updatedObjective) => {
											log.info("Save objective", { objective: updatedObjective });
											setEditingObjectiveId(null);
										}}
									/>
								</div>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>
			<Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
				<DialogContent className="p-8 outline-1 outline-primary rounded" showCloseButton={false}>
					<DialogTitle
						className="text-app-black text-2xl font-medium font-heading leading-tight"
						data-testid="delete-dialog-title"
					>
						Are you sure you want to delete this objective?
					</DialogTitle>
					<DialogDescription
						className="text-app-black font-normal leading-tight"
						data-testid="delete-dialog-description"
					>
						All content within this objective and all its associated tasks. will be permanently removed.
						This action cannot be undone.
					</DialogDescription>
					<button
						className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
						onClick={handleCancelDelete}
						type="button"
					>
						<Image alt="Close" height={16} src="/icons/close.svg" width={16} />
					</button>
					<div className="flex justify-between mt-6">
						<AppButton
							data-testid="cancel-delete-button"
							onClick={handleCancelDelete}
							type="button"
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							data-testid="confirm-delete-button"
							onClick={handleConfirmDelete}
							type="button"
							variant="primary"
						>
							Delete Objective
						</AppButton>
					</div>
				</DialogContent>
			</Dialog>
		</WizardRightPane>
	);
}

function EditableObjective({ index, objective, onCancel: _onCancel, onSave }: EditableObjectiveProps) {
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

function ObjectiveCardContent({ index, objective }: ObjectiveCardContentProps) {
	return (
		<div className="space-y-2 px-3 pb-3 pt-15">
			<h4 className="text-app-black font-semibold font-heading leading-snug">{objective.title}</h4>
			<p className="text-Grey-600 text-sm leading-none">{objective.description}</p>
			<TaskContent objectiveIndex={index} tasks={objective.research_tasks} />
		</div>
	);
}

function ObjectiveHeader({
	attributes,
	index,
	isEditing,
	listeners,
	objective,
	onCancel,
	onEdit,
	onRemove,
}: ObjectiveHeaderProps) {
	return (
		<div className="absolute -top-0.5 -left-0.5 right-0 flex items-start justify-between z-10">
			<div
				className={`flex size-10 items-center justify-center rounded rounded-bl-none rounded-tr-none text-2xl font-medium font-heading leading-loose ${isEditing ? "bg-app-gray-300 text-white" : "bg-primary text-white"}`}
			>
				{index}
			</div>

			<div className="flex-1 flex justify-center">
				<button
					aria-label={`Drag to reorder objective ${index}: ${objective.title}`}
					className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing flex items-center justify-center p-2"
					type="button"
					{...attributes}
					{...listeners}
				>
					<GripHorizontal className="flex-shrink-0" size={20} />
				</button>
			</div>

			<div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<AppButton
							className="size-8 text-gray-400 hover:text-gray-600 hover:bg-app-gray-100 focus:outline-none"
							data-testid="menu-trigger"
							size="sm"
							type="button"
							variant="ghost"
						>
							<Image alt="Menu" height={16} src="/icons/three-dots.svg" width={16} />
						</AppButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem data-testid="edit-task-menuitem" onClick={isEditing ? onCancel : onEdit}>
							<Edit className="mr-2 size-4" />
							{isEditing ? "Cancel Editing" : "Edit Task"}
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

function SortableObjectiveCard({
	id,
	index,
	isEditing,
	objective,
	onCancel,
	onEdit,
	onRemove,
	onSave,
}: SortableObjectiveCardProps) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: String(id) });

	const style = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<AppCard
			className={`rounded py-0 relative ${isEditing ? "bg-white outline-1 outline-app-gray-300" : "bg-white outline-1 outline-primary transition-colors hover:outline-2"}`}
			ref={setNodeRef}
			style={style}
		>
			<ObjectiveHeader
				attributes={attributes}
				index={index}
				isEditing={isEditing}
				listeners={listeners}
				objective={objective}
				onCancel={onCancel}
				onEdit={onEdit}
				onRemove={onRemove}
			/>
			{isEditing ? (
				<EditableObjective index={index} objective={objective} onCancel={onCancel} onSave={onSave} />
			) : (
				<ObjectiveCardContent index={index} objective={objective} />
			)}
		</AppCard>
	);
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
										value={task.description ?? task.title}
										variant="field"
									/>
								</div>
							) : (
								<div
									className="text-app-gray-600 text-sm font-normal leading-none"
									data-testid="task-display"
								>
									Task: {task.description ?? task.title}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function TaskHeader({ isEditing, objectiveIndex, onTaskDelete, taskIndex }: TaskHeaderProps) {
	return (
		<div className="absolute -top-1 left-0 right-0 flex items-center justify-between z-10">
			<div
				className={`flex size-7.5 items-center justify-center rounded-br text-base font-semibold font-heading leading-snug ${isEditing ? "bg-app-gray-300 text-white" : "bg-app-gray-50 text-primary"}`}
			>
				{objectiveIndex}.{taskIndex + 1}
			</div>

			<div className="flex-1 flex justify-center">
				<button
					aria-label={`Drag to reorder task ${taskIndex + 1}`}
					className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing flex items-center justify-center p-2"
					type="button"
				>
					<GripHorizontal className="flex-shrink-0" size={20} />
				</button>
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
