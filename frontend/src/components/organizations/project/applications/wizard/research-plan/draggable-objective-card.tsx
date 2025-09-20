"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppCard } from "@/components/app/app-card";
import type { ResearchObjective } from "@/stores/wizard-store";
import { EditableObjective, ObjectiveCardContent, ObjectiveHeader } from "./objective-components";

interface DraggableObjectiveCardProps {
	index: number;
	isEditing: boolean;
	objective: ResearchObjective;
	objectivesCount: number;
	onCancel: () => void;
	onEdit: () => void;
	onRemove: () => void;
	onSave: (updatedObjective: ResearchObjective) => Promise<void>;
}

export function DraggableObjectiveCard({
	index,
	isEditing,
	objective,
	objectivesCount,
	onCancel,
	onEdit,
	onRemove,
	onSave,
}: DraggableObjectiveCardProps) {
	const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
		id: String(objective.number),
	});

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
				objectivesCount={objectivesCount}
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
