"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	type SensorDescriptor,
	type SensorOptions,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";

import { AppButton } from "@/components/app-button";
import { IconPreviewLogo } from "@/components/projects/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApplicationStore } from "@/stores/application-store";
import { MAX_OBJECTIVES, type Objective, useWizardStore } from "@/stores/wizard-store";

export function ResearchPlanStep() {
	const application = useApplicationStore((state) => state.application);
	const addNextObjective = useWizardStore((state) => state.addNextObjective);
	const handleObjectiveDragEnd = useWizardStore((state) => state.handleObjectiveDragEnd);
	const removeObjective = useWizardStore((state) => state.removeObjective);
	const objectives = application?.research_objectives ?? [];

	const sensors: SensorDescriptor<SensorOptions>[] = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	return (
		<div className="flex size-full" data-testid="research-plan-step">
			<div className="w-1/3 overflow-y-auto p-6">
				<div className="space-y-6">
					<div>
						<h2 className="font-heading text-2xl font-medium" data-testid="research-plan-header">
							Research plan
						</h2>
						<p className="text-muted-foreground-dark mt-1 text-sm" data-testid="research-plan-description">
							Define key objectives and break them into tasks. This structure is the backbone of your app.
						</p>
					</div>

					<div className="space-y-4">
						<AppButton
							className="w-full"
							data-testid="add-objective-button"
							disabled={objectives.length >= MAX_OBJECTIVES}
							leftIcon={<Plus size={16} />}
							onClick={addNextObjective}
							variant="secondary"
						>
							{objectives.length === 0 ? "Add First Objective" : "Add Objective"}
						</AppButton>

						{objectives.length >= MAX_OBJECTIVES && (
							<Card className="border-warning-200 bg-warning-50 p-3">
								<p className="text-warning-800 text-sm">
									You&apos;ve reached the maximum of {MAX_OBJECTIVES} objectives. Please refine
									existing objectives before adding a new one.
								</p>
							</Card>
						)}
					</div>
				</div>
			</div>

			<ResearchPlanPreview
				objectives={objectives}
				onDragEnd={handleObjectiveDragEnd}
				onRemoveObjective={removeObjective}
				sensors={sensors}
			/>
		</div>
	);
}

function ResearchPlanPreview({
	objectives,
	onDragEnd,
	onRemoveObjective,
	sensors,
}: {
	objectives: Objective[];
	onDragEnd: (event: DragEndEvent) => void;
	onRemoveObjective: (objectiveNumber: number) => void;
	sensors: SensorDescriptor<SensorOptions>[];
}) {
	const hasObjectives = objectives.length > 0;

	return (
		<div className="bg-preview-bg flex h-full w-2/3 flex-col border-l border-gray-100 px-8 py-6">
			{hasObjectives ? (
				<>
					<div className="mb-6">
						<p className="text-muted-foreground-dark text-sm">
							{objectives.length} of {MAX_OBJECTIVES} objectives defined
						</p>
					</div>

					<div className="flex-1">
						<DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
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
												onRemoveObjective(objective.number);
											}}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					</div>
				</>
			) : (
				<div className="flex h-full flex-col items-center justify-center" data-testid="empty-state">
					<IconPreviewLogo height={180} width={180} />
					<p
						className="text-muted-foreground-dark mt-6 text-center text-sm"
						data-testid="empty-state-message"
					>
						Add your first research objective to get started
					</p>
				</div>
			)}
		</div>
	);
}

function SortableObjectiveCard({
	id,
	index,
	objective,
	onRemove,
}: {
	id: number;
	index: number;
	objective: Objective;
	onRemove: () => void;
}) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: String(id) });

	const style = {
		opacity: isDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<Card
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
							className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
							{...attributes}
							{...listeners}
						>
							<GripVertical size={20} />
						</button>
					</div>
					<Button
						className="size-8 text-gray-400 hover:text-gray-600"
						onClick={onRemove}
						size="sm"
						type="button"
						variant="ghost"
					>
						<MoreHorizontal size={16} />
					</Button>
				</div>
				<div className="space-y-1">
					<h4 className="line-clamp-2 font-medium text-gray-900">{objective.title}</h4>
					<p className="text-muted-foreground line-clamp-3 text-sm">{objective.description}</p>
				</div>
				<div className="text-xs text-gray-500">Tasks</div>
			</div>
		</Card>
	);
}
