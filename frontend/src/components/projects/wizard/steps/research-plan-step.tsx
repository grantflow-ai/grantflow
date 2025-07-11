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
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardLeftPane, WizardRightPane } from "@/components/projects/wizard/shared";
import { useApplicationStore } from "@/stores/application-store";
import { MAX_OBJECTIVES, type Objective, useWizardStore } from "@/stores/wizard-store";

export function ResearchPlanStep() {
	const application = useApplicationStore((state) => state.application);
	const addNextObjective = useWizardStore((state) => state.addNextObjective);
	const handleObjectiveDragEnd = useWizardStore((state) => state.handleObjectiveDragEnd);
	const removeObjective = useWizardStore((state) => state.removeObjective);
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_plan);
	const objectives = application?.research_objectives ?? [];

	const sensors: SensorDescriptor<SensorOptions>[] = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	return (
		<div className="flex size-full" data-testid="research-plan-step">
			<WizardLeftPane testId="research-plan-left-pane">
				<div className="flex items-start justify-between">
					<div>
						<h2 className="font-heading text-2xl font-medium" data-testid="research-plan-header">
							Research plan
						</h2>
						<p className="text-muted-foreground-dark mt-1 text-sm" data-testid="research-plan-description">
							Define your key objectives and break them into actionable tasks. This structure forms the
							backbone of your application.
						</p>
					</div>
					<AppButton
						className="bg-app-surface-secondary text-app-primary border-app-border-primary shrink-0"
						data-testid="ai-try-button"
						disabled={isAutofillLoading || !application}
						leftIcon={<span>✨</span>}
						onClick={() => triggerAutofill("research_plan")}
						variant="secondary"
					>
						{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
					</AppButton>
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
						<AppCard className="border-app-border-primary bg-app-surface-secondary p-3 flex items-start gap-3">
							<div className="bg-app-surface-secondary text-app-primary flex size-6 shrink-0 items-center justify-center rounded-full">
								<svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										clipRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
										fillRule="evenodd"
									/>
								</svg>
							</div>
							<p className="text-app-text-primary text-sm">
								You&apos;ve reached the maximum of {MAX_OBJECTIVES} objectives. Please edit or remove an
								existing objective before adding a new one.
							</p>
						</AppCard>
					)}
				</div>
			</WizardLeftPane>

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
		<WizardRightPane padding="px-8 py-6">
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
					<div className="relative">
						<div className="flex size-96 items-center justify-center">
							<div className="relative">
								{}
								<div className="bg-gray-100 animate-pulse flex size-24 items-center justify-center rounded-full">
									<div className="bg-gray-200 size-12 rounded-full" />
								</div>

								{}
								<div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
									<div className="bg-blue-100 absolute -top-4 left-1/2 size-8 -translate-x-1/2 rounded-full" />
								</div>
								<div
									className="absolute inset-0 animate-spin"
									style={{ animationDirection: "reverse", animationDuration: "4s" }}
								>
									<div className="bg-purple-100 absolute -bottom-4 left-1/2 size-6 -translate-x-1/2 rounded-full" />
								</div>
								<div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s" }}>
									<div className="bg-green-100 absolute -left-4 top-1/2 size-4 -translate-y-1/2 rounded-full" />
								</div>
							</div>
						</div>
						<p className="text-center mt-6 text-muted-foreground" data-testid="empty-state-message">
							Add your first objective to get started
						</p>
					</div>
				</div>
			)}
		</WizardRightPane>
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
							className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
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
