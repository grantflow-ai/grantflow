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
import Image from "next/image";
import { useState } from "react";
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardLeftPane, WizardRightPane } from "@/components/projects/wizard/shared";
import { ObjectiveForm, type ObjectiveFormData } from "@/components/projects/wizard/shared/objective-form";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { useApplicationStore } from "@/stores/application-store";
import { MAX_OBJECTIVES, type Objective, useWizardStore } from "@/stores/wizard-store";

export function ResearchPlanStep() {
	const application = useApplicationStore((state) => state.application);
	const addObjective = useWizardStore((state) => state.addObjective);
	const handleObjectiveDragEnd = useWizardStore((state) => state.handleObjectiveDragEnd);
	const removeObjective = useWizardStore((state) => state.removeObjective);
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_plan);
	const objectives = application?.research_objectives ?? [];

	const [showObjectiveForm, setShowObjectiveForm] = useState(false);
	const [isInfoBannerVisible, setIsInfoBannerVisible] = useState(true);

	const handleAddObjectiveClick = () => {
		setShowObjectiveForm(true);
	};

	const handleSaveObjective = (data: ObjectiveFormData) => {
		// Convert ObjectiveFormData to the format expected by the store
		const objective = {
			description: data.description,
			number: objectives.length + 1, // This will be overridden by addObjective, but required by type
			research_tasks: data.tasks.map((task, index) => ({
				description: task.description,
				number: index + 1,
				title: "", // Required by the task type but not used in our form
			})),
			title: data.name,
		};

		addObjective(objective);
		setShowObjectiveForm(false);
	};

	const sensors: SensorDescriptor<SensorOptions>[] = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	return (
		<div className="flex size-full" data-testid="research-plan-step">
			<WizardLeftPane testId="research-plan-left-pane">
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-4">
						<h2
							className="font-heading text-lg md:text-xl lg:text-2xl font-medium"
							data-testid="research-plan-header"
						>
							Research plan
						</h2>
						<AppButton
							className="shrink-0"
							data-testid="ai-try-button"
							disabled={isAutofillLoading || !application}
							leftIcon={<Image alt="AI Try" height={16} src="/icons/button-logo.svg" width={16} />}
							onClick={() => triggerAutofill("research_plan")}
							variant="secondary"
						>
							{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
						</AppButton>
					</div>
					<p className="text-muted-foreground-dark leading-tight" data-testid="research-plan-description">
						Define your key objectives and break them into actionable tasks. This structure forms the
						backbone of your application.
					</p>
				</div>

				{isInfoBannerVisible && objectives.length >= MAX_OBJECTIVES && (
					<ResearchPlanInfoBanner
						onClose={() => {
							setIsInfoBannerVisible(false);
						}}
					/>
				)}

				<div className="space-y-4">
					{!showObjectiveForm && (
						<AppButton
							data-testid="add-objective-button"
							disabled={objectives.length >= MAX_OBJECTIVES}
							leftIcon={<Plus size={16} />}
							onClick={handleAddObjectiveClick}
							variant="secondary"
						>
							{objectives.length === 0 ? "Add First Objective" : "Add Objective"}
						</AppButton>
					)}

					{showObjectiveForm && (
						<ObjectiveForm objectiveNumber={objectives.length + 1} onSave={handleSaveObjective} />
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

function ResearchPlanInfoBanner({ onClose }: { onClose: () => void }) {
	return (
		<div className="self-stretch p-2 bg-slate-100 rounded outline-1 outline-offset-[-1px] outline-slate-400 inline-flex justify-start items-start gap-1">
			<Image alt="Info" className="shrink-0" height={16} src="/icons/icon-toast-info.svg" width={16} />
			<div className="flex-1 grow text-sm text-app-black font-normal leading-tight">
				You can add up to a maximum of 5 objectives for your grant application.
			</div>
			<button className="shrink-0 self-start" onClick={onClose} type="button">
				<Image
					alt="Close"
					className="hover:opacity-60 transition-opacity cursor-pointer"
					height={16}
					src="/icons/close.svg"
					width={16}
				/>
			</button>
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
		<WizardRightPane padding="p-6">
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
				<div className="flex h-full flex-col" data-testid="empty-state">
					<EmptyStatePreview />
					<p className="text-center text-muted-foreground" data-testid="empty-state-message">
						Add your first objective to get started
					</p>
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
