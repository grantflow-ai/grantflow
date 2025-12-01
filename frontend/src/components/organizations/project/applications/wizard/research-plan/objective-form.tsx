"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import AppTextArea from "@/components/app/fields/textarea-field";
import { cn } from "@/lib/utils";
import type { API } from "@/types/api-types";
import { drop } from "@/utils/helpers";
import { FloatingActionPanel } from "./floating-action-panel";

export type ObjectiveFormData = {
	tasks: ObjectiveFormTask[];
} & Omit<NonNullable<API.UpdateApplication.RequestBody["research_objectives"]>[0], "research_tasks">;

export type ObjectiveFormTask = {
	id: string;
} & NonNullable<API.UpdateApplication.RequestBody["research_objectives"]>[0]["research_tasks"][0];

interface ObjectiveFormProps {
	className?: string;
	initialData?: ObjectiveFormData;
	objectiveNumber: number;
	onSaveAction: (data: ObjectiveFormData) => void;
}

const scrollToBottom = () => {
	const scrollContainer = document.querySelector('[data-testid="research-plan-left-pane"] .overflow-y-auto');
	if (scrollContainer) {
		scrollContainer.scrollTo({
			behavior: "smooth",
			top: scrollContainer.scrollHeight,
		});
	} else {
		window.scrollTo({ behavior: "smooth", top: document.body.scrollHeight });
	}
};

export function ObjectiveForm({ className, initialData, objectiveNumber, onSaveAction }: ObjectiveFormProps) {
	const [formData, setFormData] = useState<ObjectiveFormData>(
		initialData ?? {
			description: "",
			number: objectiveNumber,
			tasks: [],
			title: "",
		},
	);

	const [errors, setErrors] = useState<{
		description?: string;
		tasks?: Record<string, string>;
		title?: string;
	}>({});

	const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const prevTaskCountRef = useRef(0);
	const prevVisibleDescriptionsRef = useRef(0);

	useEffect(() => {
		const currentTaskCount = formData.tasks.length;
		const hasNewTask = currentTaskCount > prevTaskCountRef.current;

		const visibleDescriptionCount = formData.tasks.filter((task) => task.title.trim()).length;
		const hasNewVisibleDescription = visibleDescriptionCount > prevVisibleDescriptionsRef.current;

		if (hasNewTask || hasNewVisibleDescription) {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}

			scrollTimeoutRef.current = setTimeout(() => {
				scrollToBottom();
				scrollTimeoutRef.current = null;
			}, 550);
		}

		prevTaskCountRef.current = currentTaskCount;
		prevVisibleDescriptionsRef.current = visibleDescriptionCount;
	}, [formData.tasks]);

	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
			}
		};
	}, []);

	const updateField = (field: keyof Omit<ObjectiveFormData, "number" | "tasks">, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const updateTask = (taskId: string, field: "description" | "title", value: string) => {
		setFormData((prev) => ({
			...prev,
			tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
		}));

		if (errors.tasks?.[taskId]) {
			setErrors((prev) => {
				const newTasks = { ...prev.tasks };
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete newTasks[taskId];

				if (Object.keys(newTasks).length === 0) {
					return drop(prev, "tasks");
				}

				return {
					...prev,
					tasks: newTasks,
				};
			});
		}
	};

	const prevTaskTitlesRef = useRef<Record<string, string>>({});

	const handleTaskFieldChange = (taskId: string, field: "description" | "title", value: string) => {
		updateTask(taskId, field, value);

		if (field === "title") {
			prevTaskTitlesRef.current[taskId] = value;

			if (!value.trim()) {
				setFormData((prev) => ({
					...prev,
					tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, description: "" } : task)),
				}));
			}
		}

		if (cleanupTimeoutRef.current) {
			clearTimeout(cleanupTimeoutRef.current);
		}

		cleanupTimeoutRef.current = setTimeout(() => {
			cleanupEmptyTasks();
			cleanupTimeoutRef.current = null;
		}, 500);
	};

	const addTask = () => {
		const newTaskId = crypto.randomUUID();
		const currentTaskCount = formData.tasks.length;
		setFormData((prev) => ({
			...prev,
			tasks: [...prev.tasks, { description: "", id: newTaskId, number: currentTaskCount + 1, title: "" }],
		}));

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const newTaskElement = document.querySelector(`[data-testid="task-title-${currentTaskCount}"]`);
				if (newTaskElement) {
					const textarea = newTaskElement.querySelector("textarea");
					textarea?.focus();
				}
			});
		});
	};

	const cleanupEmptyTasks = () => {
		setFormData((prev) => ({
			...prev,
			tasks: prev.tasks.filter((task) => task.title.trim() || task.description?.trim()),
		}));
	};

	const validateForm = (): boolean => {
		const newErrors: typeof errors = {};

		if (!formData.title.trim()) {
			newErrors.title = "Objective title is required";
		}

		if (!formData.description?.trim()) {
			newErrors.description = "Objective description is required";
		}

		const taskErrors: Record<string, string> = {};
		for (const task of formData.tasks) {
			if (!task.title.trim()) {
				taskErrors[task.id] = "Task title is required";
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

	const canAddTask = (): boolean => {
		if (!(formData.title.trim() && formData.description?.trim())) {
			return false;
		}
		return formData.tasks.every((task) => task.title.trim());
	};

	const canAddObjective = (): boolean => {
		if (!(formData.title.trim() && formData.description?.trim())) {
			return false;
		}
		return formData.tasks.some((task) => task.title.trim());
	};

	return (
		<div className="flex flex-col space-y-2 2xl:space-y-3">
			<div className={cn("space-y-3", className)} data-testid="objective-form">
				<h2
					className="font-semibold font-heading text-app-black leading-snug"
					data-testid="objective-form-heading"
				>
					Objective {objectiveNumber}
				</h2>

				<AppTextArea
					className="min-h-24 2xl:min-h-32"
					errorMessage={errors.title}
					id="objective-title-input"
					label="Objective title"
					onChange={(e) => {
						updateField("title", e.target.value);
					}}
					placeholder="Enter a clear, measurable objective"
					testId="objective-title-input"
					value={formData.title}
				/>

				<AppTextArea
					className="min-h-32 2xl:min-h-52"
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

				<h3 className="font-semibold font-heading text-app-black leading-snug">Tasks</h3>
				<p className="text-muted-foreground-dark leading-tight">
					Describe steps to achieve this objective. You can add more than one!
				</p>

				{formData.tasks.map((task, index) => {
					const shouldShowDescription = task.title.trim() || task.description?.trim();
					return (
						<div className="space-y-3" key={task.id}>
							<AppTextArea
								className="min-h-24 2xl:min-h-32"
								errorMessage={task.title.trim() ? undefined : errors.tasks?.[task.id]}
								id={`task-title-${index}`}
								label="Task title"
								onChange={(e) => {
									handleTaskFieldChange(task.id, "title", e.target.value);
								}}
								placeholder="Enter a brief task title"
								testId={`task-title-${index}`}
								value={task.title}
							/>

							<div
								className={cn(
									"transition-all duration-500 ease-in-out overflow-hidden",
									shouldShowDescription
										? "max-h-96 opacity-100 transform translate-y-0"
										: "max-h-0 opacity-0 transform -translate-y-2",
								)}
							>
								<AppTextArea
									className="min-h-32 2xl:min-h-52"
									id={`task-description-${index}`}
									label="Task description"
									onChange={(e) => {
										handleTaskFieldChange(task.id, "description", e.target.value);
									}}
									placeholder="Describe the steps to complete this task"
									testId={`task-description-${index}`}
									value={task.description ?? ""}
								/>
							</div>
						</div>
					);
				})}
			</div>

			<FloatingActionPanel>
				<AppButton
					className="w-full"
					data-testid="add-task-button"
					disabled={!canAddTask()}
					leftIcon={<Plus size={16} />}
					onClick={addTask}
					variant="secondary"
				>
					Add Task
				</AppButton>
				<AppButton
					className="w-full"
					data-testid="add-objective-button"
					disabled={!canAddObjective()}
					onClick={handleSave}
					type="button"
					variant="primary"
				>
					Add Objective
				</AppButton>
			</FloatingActionPanel>
		</div>
	);
}
