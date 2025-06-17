"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	SensorDescriptor,
	SensorOptions,
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
import React from "react";

import { AppButton } from "@/components/app-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPreviewLogo } from "@/components/workspaces/icons";
import { type Objective, useWizardStore } from "@/stores/wizard-store";

const MAX_OBJECTIVES = 5;

export function ResearchPlanStep() {
	const { addObjective, applicationState, removeObjective, reorderObjectives } = useWizardStore();
	const { objectives } = applicationState;

	const sensors: SensorDescriptor<SensorOptions>[] = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleAddObjective = () => {
		const exampleObjectives = [
			{
				description:
					"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie. Aenean ut volutpat nisl enim. Ornare dolor cursus erat. Accumsan tempor vestibulum sapien at velit odio. Aliquam vel ornare pulvinar congue porttitor sed nisl rutrum blandit. Elit magna nulla mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus odio fermentum suspendisse mauris. Ullamcorper quis nunc mauris pharetra ipsum, vitae tincidunt nibh risus erat. Risus.",
				title: "Dissect principles of the inhibitory crosstalk and signaling in the TME by comprehensive single-cell profiling of the tumor microenvironment and signaling in PD-1+ tumor infiltrating T cells in cancer patients",
			},
			{
				description:
					"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim. Vel cursus ipsum molestie.",
				title: "Optimize therapeutic targeting strategies",
			},
			{
				description:
					"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse enim.",
				title: "Develop novel biomarker identification methods",
			},
			{
				description:
					"Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus vulputate suspendisse.",
				title: "Analyze immune cell interactions",
			},
			{
				description: "Lorem ipsum dolor sit amet consectetur. Feugiat faucibus urna ligula risus lacus.",
				title: "Investigate resistance mechanisms",
			},
		];

		const currentIndex = objectives.length;
		const exampleObj = exampleObjectives[currentIndex] || exampleObjectives[0];

		addObjective({
			description: exampleObj.description,
			tasks: [],
			title: exampleObj.title,
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (active.id !== over?.id) {
			const oldIndex = objectives.findIndex((obj) => obj.id === active.id);
			const newIndex = objectives.findIndex((obj) => obj.id === over?.id);

			reorderObjectives(oldIndex, newIndex);
		}
	};

	const getButtonText = () => {
		if (objectives.length === 0) {
			return "Add First Objective";
		}
		return "Add Objective";
	};

	const canAddObjective = objectives.length < MAX_OBJECTIVES;

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
							disabled={!canAddObjective}
							leftIcon={<Plus size={16} />}
							onClick={handleAddObjective}
							variant="secondary"
						>
							{getButtonText()}
						</AppButton>

						{!canAddObjective && (
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
				onDragEnd={handleDragEnd}
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
	onRemoveObjective: (id: string) => void;
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
								items={objectives.map((obj) => obj.id)}
								strategy={horizontalListSortingStrategy}
							>
								<div className="grid grid-cols-5 gap-4">
									{objectives.map((objective, index) => (
										<SortableObjectiveCard
											id={objective.id}
											index={index + 1}
											key={objective.id}
											objective={objective}
											onRemove={() => {
												onRemoveObjective(objective.id);
											}}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					</div>
				</>
			) : (
				<div className="flex h-full flex-col items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
					<p className="text-muted-foreground-dark mt-6 text-center text-sm">
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
}: {
	id: string;
	index: number;
	objective: Objective;
	onRemove: () => void;
}) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id });

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
					<Button className="size-8 text-gray-400 hover:text-gray-600" size="sm" variant="ghost">
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
