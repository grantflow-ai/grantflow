"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardRightPane } from "@/components/projects/wizard/shared";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useApplicationStore } from "@/stores/application-store";
import { MAX_OBJECTIVES, type Objective, useWizardStore } from "@/stores/wizard-store";

interface SortableObjectiveCardProps {
	id: number;
	index: number;
	objective: Objective;
	onRemove: () => void;
}

export function ResearchPlanPreview() {
	const objectives = useApplicationStore((state) => state.application?.research_objectives ?? []);
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
			<div className="mb-6">
				<p className="text-muted-foreground-dark text-sm">
					{objectives.length} of {MAX_OBJECTIVES} objectives defined
				</p>
			</div>

			<div className="flex-1">
				<DndContext collisionDetection={closestCenter} onDragEnd={handleObjectiveDragEnd} sensors={sensors}>
					<SortableContext
						items={objectives.map((obj) => obj.number)}
						strategy={horizontalListSortingStrategy}
					>
						<div className="grid grid-cols-5 gap-4">
							{objectives.map((objective, index) => (
								<SortableObjectiveCard
									id={objective.number}
									index={index + 1}
									key={`${objective.title}-${objective.description}-${index}`}
									objective={objective}
									onRemove={() => {
										removeObjective(objective.number);
									}}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>
		</WizardRightPane>
	);
}

function SortableObjectiveCard({ id, index, objective, onRemove }: SortableObjectiveCardProps) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: String(id) });

	const style = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<AppCard
			className="cursor-grab border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 active:cursor-grabbing"
			ref={setNodeRef}
			style={style}
		>
			<div className="space-y-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
							{index}
						</div>
						<button
							aria-label={`Drag to reorder objective ${index}: ${objective.title}`}
							className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
							type="button"
							{...attributes}
							{...listeners}
						>
							<GripVertical size={20} />
						</button>
					</div>
					<AppButton
						className="size-8 text-gray-400 hover:text-gray-600"
						onClick={onRemove}
						size="sm"
						type="button"
						variant="ghost"
					>
						<MoreHorizontal size={16} />
					</AppButton>
				</div>
				<div className="space-y-1">
					<h4 className="line-clamp-2 font-medium text-gray-900">{objective.title}</h4>
					<p className="text-muted-foreground line-clamp-3 text-sm">{objective.description}</p>
				</div>
				<div className="text-xs text-gray-500">Tasks</div>
			</div>
		</AppCard>
	);
}
