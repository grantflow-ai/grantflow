"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripHorizontal, Trash2 } from "lucide-react";
import Image from "next/image";
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardRightPane } from "@/components/projects/wizard/shared";
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

interface ObjectiveCardContentProps {
	index: number;
	objective: Objective;
}

interface ObjectiveHeaderProps {
	attributes: any;
	index: number;
	listeners: any;
	objective: Objective;
	onEdit: () => void;
	onRemove: () => void;
}

interface SortableObjectiveCardProps {
	id: number;
	index: number;
	objective: Objective;
	onEdit: () => void;
	onRemove: () => void;
}

interface TaskContentProps {
	objectiveIndex: number;
	tasks: { description?: string; number: number; title: string }[];
}

interface TaskHeaderProps {
	objectiveIndex: number;
	taskIndex: number;
}

const getGridClasses = (count: number) => {
	if (count === 1) return "grid grid-cols-2 gap-4";
	if (count === 2) return "grid grid-cols-2 gap-4";
	return "grid grid-cols-3 gap-4";
};

export function ResearchPlanPreview() {
	const objectives = useApplicationStore((state) => state.application?.research_objectives) ?? [];
	const handleObjectiveDragEnd = useWizardStore((state) => state.handleObjectiveDragEnd);
	const removeObjective = useWizardStore((state) => state.removeObjective);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

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
										objective={objective}
										onEdit={() => {
											log.info("Edit objective");
										}}
										onRemove={() => {
											removeObjective(objective.number);
										}}
									/>
								</div>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>
		</WizardRightPane>
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

function ObjectiveHeader({ attributes, index, listeners, objective, onEdit, onRemove }: ObjectiveHeaderProps) {
	return (
		<div className="absolute -top-0.5 -left-0.5 right-0 flex items-center justify-between z-10">
			<div className="flex size-10 items-center justify-center rounded rounded-bl-none rounded-tr-none bg-primary text-sm font-medium text-white">
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
							className="size-8 text-gray-400 hover:text-gray-600 hover:bg-app-gray-100"
							size="sm"
							type="button"
							variant="ghost"
						>
							<Image alt="Menu" height={16} src="/icons/three-dots.svg" width={16} />
						</AppButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onEdit}>
							<Edit className="mr-2 size-4" />
							Edit Task
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onRemove}>
							<Trash2 className="mr-2 size-4" />
							Remove
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

function SortableObjectiveCard({ id, index, objective, onEdit, onRemove }: SortableObjectiveCardProps) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: String(id) });

	const style = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<AppCard
			className="bg-white outline-1 outline-primary rounded transition-colors hover:outline-2 py-0 relative"
			ref={setNodeRef}
			style={style}
		>
			<ObjectiveHeader
				attributes={attributes}
				index={index}
				listeners={listeners}
				objective={objective}
				onEdit={onEdit}
				onRemove={onRemove}
			/>
			<ObjectiveCardContent index={index} objective={objective} />
		</AppCard>
	);
}

function TaskContent({ objectiveIndex, tasks }: TaskContentProps) {
	return (
		<div className="space-y-3">
			<div className="text-app-black font-semibold font-heading leading-snug">Tasks</div>
			<div className="space-y-1">
				{tasks.map((task, taskIndex) => (
					<div className="border border-gray-200 rounded relative" key={taskIndex}>
						<TaskHeader objectiveIndex={objectiveIndex} taskIndex={taskIndex} />
						<div className="pt-9.5 px-3 pb-3">
							<div className="text-app-gray-600 text-sm font-normal leading-none">
								Task: {task.description ?? task.title}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function TaskHeader({ objectiveIndex, taskIndex }: TaskHeaderProps) {
	return (
		<div className="absolute -top-1 left-0 right-0 flex items-center justify-between z-10">
			<div className="flex size-7.5 items-center justify-center bg-app-gray-50 font-semibold font-heading leading-snug text-primary">
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
		</div>
	);
}
