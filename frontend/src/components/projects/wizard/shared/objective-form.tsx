"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { IconButton } from "@/components/app/buttons/icon-button";
import AppTextArea from "@/components/app/forms/textarea-field";
import { cn } from "@/lib/utils";

export interface ObjectiveFormData {
	description: string;
	name: string;
	tasks: ObjectiveTask[];
}

export interface ObjectiveTask {
	description: string;
	id: string;
}

interface ObjectiveFormProps {
	className?: string;
	initialData?: ObjectiveFormData;
	objectiveNumber: number;
	onSaveAction: (data: ObjectiveFormData) => void;
}

export function ObjectiveForm({ className, initialData, objectiveNumber, onSaveAction }: ObjectiveFormProps) {
	const [formData, setFormData] = useState<ObjectiveFormData>(
		initialData ?? {
			description: "",
			name: "",
			tasks: [{ description: "", id: crypto.randomUUID() }],
		},
	);

	const [errors, setErrors] = useState<{
		description?: string;
		name?: string;
		tasks?: Record<string, string>;
	}>({});

	const updateField = (field: keyof Omit<ObjectiveFormData, "tasks">, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const updateTask = (taskId: string, description: string) => {
		setFormData((prev) => ({
			...prev,
			tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, description } : task)),
		}));

		if (errors.tasks?.[taskId]) {
			setErrors((prev) => {
				const newTasks = { ...prev.tasks };
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete newTasks[taskId];
				return {
					...prev,
					tasks: Object.keys(newTasks).length > 0 ? newTasks : undefined,
				};
			});
		}
	};

	const addTask = () => {
		setFormData((prev) => ({
			...prev,
			tasks: [...prev.tasks, { description: "", id: crypto.randomUUID() }],
		}));
	};

	const validateForm = (): boolean => {
		const newErrors: typeof errors = {};

		if (!formData.name.trim()) {
			newErrors.name = "Objective name is required";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Objective description is required";
		}

		const taskErrors: Record<string, string> = {};
		for (const task of formData.tasks) {
			if (!task.description.trim()) {
				taskErrors[task.id] = "Task description is required";
			}
		}

		if (Object.keys(taskErrors).length > 0) {
			newErrors.tasks = taskErrors;
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSave = () => {
		if (validateForm()) {
			onSaveAction(formData);
		}
	};

	const isFormValid = (): boolean => {
		return Boolean(
			formData.name.trim() &&
				formData.description.trim() &&
				formData.tasks.every((task) => task.description.trim()),
		);
	};

	return (
		<div className="flex flex-col space-y-3">
			<div className={cn("space-y-3", className)} data-testid="objective-form">
				<h2
					className="font-semibold font-heading text-app-black leading-snug"
					data-testid="objective-form-heading"
				>
					Objective {objectiveNumber}
				</h2>

				<AppTextArea
					className="min-h-32"
					errorMessage={errors.name}
					id="objective-name-input"
					label="Objective name"
					onChange={(e) => {
						updateField("name", e.target.value);
					}}
					placeholder="Enter a clear, measurable objective"
					testId="objective-name-input"
					value={formData.name}
				/>

				<AppTextArea
					className="min-h-52"
					errorMessage={errors.description}
					id="objective-description-input"
					label="Objective description"
					onChange={(e) => {
						updateField("description", e.target.value);
					}}
					placeholder="Describe how this objective supports the grant's goals"
					testId="objective-description-input"
					value={formData.description}
				/>

				<div className="flex items-center justify-between">
					<h3 className="font-semibold font-heading text-app-black leading-snug">Tasks</h3>
					<IconButton
						data-testid="add-task-button"
						disabled={formData.tasks.length === 1 && !formData.tasks[0].description.trim()}
						onClick={addTask}
						size="sm"
						type="button"
						variant="solid"
					>
						<Plus className="w-4 h-4" />
					</IconButton>
				</div>

				{formData.tasks.map((task, index) => (
					<AppTextArea
						className="min-h-52"
						errorMessage={errors.tasks?.[task.id]}
						id={`task-description-${index}`}
						key={task.id}
						label="Task description"
						onChange={(e) => {
							updateTask(task.id, e.target.value);
						}}
						placeholder="Describe a step to achieve this objective"
						testId={`task-description-${index}`}
						value={task.description}
					/>
				))}
			</div>

			<div className="flex justify-end">
				<AppButton
					data-testid="save-button"
					disabled={!isFormValid()}
					onClick={handleSave}
					type="button"
					variant="primary"
				>
					Save
				</AppButton>
			</div>
		</div>
	);
}
