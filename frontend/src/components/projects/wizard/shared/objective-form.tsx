"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
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

	const removeTask = (taskId: string) => {
		if (formData.tasks.length > 1) {
			setFormData((prev) => ({
				...prev,
				tasks: prev.tasks.filter((task) => task.id !== taskId),
			}));
		}
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
		formData.tasks.forEach((task) => {
			if (!task.description.trim()) {
				taskErrors[task.id] = "Task description is required";
			}
		});

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

	return (
		<div className={cn("space-y-6", className)} data-testid="objective-form">
			{/* Header */}
			<h2 className="text-lg font-medium text-gray-900" data-testid="objective-form-heading">
				Objective {objectiveNumber}
			</h2>

			{/* Objective Name */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700" htmlFor="objective-name-input">
					Objective name
				</label>
				<AppTextArea
					className="min-h-7 h-7 resize-none [field-sizing:none]"
					errorMessage={errors.name}
					id="objective-name-input"
					onChange={(e) => {
						updateField("name", e.target.value);
					}}
					placeholder="Enter a clear, measurable objective"
					testId="objective-name-input"
					value={formData.name}
				/>
			</div>

			{/* Objective Description */}
			<div className="space-y-2">
				<label className="block text-sm font-medium text-gray-700" htmlFor="objective-description-input">
					Objective description
				</label>
				<AppTextArea
					className="resize-none [field-sizing:none]"
					errorMessage={errors.description}
					id="objective-description-input"
					onChange={(e) => {
						updateField("description", e.target.value);
					}}
					placeholder="Describe how this objective supports the grant's goals"
					rows={1}
					testId="objective-description-input"
					value={formData.description}
				/>
			</div>

			{/* Tasks Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-medium text-gray-900">Tasks</h3>
					<AppButton data-testid="add-task-button" onClick={addTask} size="sm" type="button" variant="ghost">
						<Plus className="w-4 h-4" />
					</AppButton>
				</div>

				{/* Task List */}
				<div className="space-y-3">
					{formData.tasks.map((task, index) => (
						<div className="space-y-2" key={task.id}>
							<div className="flex items-center justify-between">
								<label
									className="block text-sm font-medium text-gray-700"
									htmlFor={`task-description-${index}`}
								>
									Task description
								</label>
								{formData.tasks.length > 1 && (
									<button
										className="text-sm text-red-600 hover:text-red-800"
										data-testid={`remove-task-${index}`}
										onClick={() => {
											removeTask(task.id);
										}}
										type="button"
									>
										Remove
									</button>
								)}
							</div>
							<AppTextArea
								className="resize-none [field-sizing:none]"
								errorMessage={errors.tasks?.[task.id]}
								id={`task-description-${index}`}
								onChange={(e) => {
									updateTask(task.id, e.target.value);
								}}
								placeholder="Describe a step to achieve this objective"
								rows={1}
								testId={`task-description-${index}`}
								value={task.description}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end pt-4">
				<AppButton data-testid="save-button" onClick={handleSave} type="button" variant="primary">
					Save
				</AppButton>
			</div>
		</div>
	);
}
