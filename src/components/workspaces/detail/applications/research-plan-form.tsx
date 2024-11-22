import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "gen/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { Checkbox } from "gen/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton } from "@/components/submit-button";
import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { Textarea } from "gen/ui/textarea";
import { FileUploader } from "@/components/file-uploader";
import { FileAttributes, FilesDisplay } from "@/components/files-display";
import { cn } from "gen/cn";
import { Fragment, useMemo, useState } from "react";
import { ResearchAim, ResearchTask } from "@/types/database-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import { uploadFiles } from "@/actions/file";

const researchTaskSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
});

const researchAimSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
	requiresClinicalTrials: z.boolean().optional(),
	tasks: z.array(researchTaskSchema).min(1, "At least one research task is required"),
});

const researchPlanFormSchema = z.object({
	files: z.array(z.custom<FileAttributes>()),
	researchAims: z.array(researchAimSchema).min(1, "At least one research aim is required"),
});

type ResearchPlanFormValues = z.infer<typeof researchPlanFormSchema>;

function ResearchTaskForm({
	form,
	aimIndex,
	taskIndex,
	remove,
	loading,
}: {
	form: UseFormReturn<ResearchPlanFormValues>;
	aimIndex: number;
	taskIndex: number;
	remove: () => void;
	loading: boolean;
}) {
	return (
		<AccordionItem value={`task-${taskIndex}`}>
			<AccordionTrigger className="text-lg font-semibold">Research Task {taskIndex + 1}</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-4 p-4 border rounded-md">
					<div className="flex justify-between items-center">
						<h4 className="text-lg font-semibold">Research Task {taskIndex + 1}</h4>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={remove}
							disabled={taskIndex === 0 && form.getValues().researchAims[aimIndex].tasks.length === 1}
							data-testid={`remove-task-button-${aimIndex}-${taskIndex}`}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Task
						</Button>
					</div>
					<FormField
						control={form.control}
						name={`researchAims.${aimIndex}.tasks.${taskIndex}.title`}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										className="text-xl"
										data-testid={`task-title-label-${aimIndex}-${taskIndex}`}
									>
										Task Title
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`task-title-help-${aimIndex}-${taskIndex}`}
												aria-label="Task title information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent role="tooltip">
											Enter the title of the research task.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Input
										{...field}
										disabled={loading}
										placeholder="Enter the task title"
										data-testid={`task-title-input-${aimIndex}-${taskIndex}`}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`task-title-counter-${aimIndex}-${taskIndex}`}
										data-testid={`task-title-char-count-${aimIndex}-${taskIndex}`}
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											field.value.length < 5 && "text-red-500",
											field.value.length >= 5 && field.value.length <= 255 && "text-green-500",
											field.value.length > 255 && "text-red-500",
										)}
									>
										{field.value.length} characters
										{field.value.length < 5 && ` (${5 - field.value.length} more required)`}
										{field.value.length > 255 && ` (${field.value.length - 255} over limit)`}
									</p>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name={`researchAims.${aimIndex}.tasks.${taskIndex}.description`}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										className="text-xl"
										data-testid={`task-description-label-${aimIndex}-${taskIndex}`}
									>
										Task Description
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`task-description-help-${aimIndex}-${taskIndex}`}
												aria-label="Task description information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent role="tooltip">
											Enter a description for your research task.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Textarea
										{...field}
										ref={(textarea) => {
											if (textarea) {
												textarea.style.height = "0px";
												textarea.style.height = `${textarea.scrollHeight}px`;
											}
										}}
										disabled={loading}
										placeholder="Enter the task description"
										data-testid={`task-description-input-${aimIndex}-${taskIndex}`}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`task-description-counter-${aimIndex}-${taskIndex}`}
										data-testid={`task-description-char-count-${aimIndex}-${taskIndex}`}
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											"text-green-500",
										)}
									>
										{field.value.length} characters
									</p>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

function ResearchAimForm({
	form,
	index,
	remove,
	loading,
}: {
	form: UseFormReturn<ResearchPlanFormValues>;
	index: number;
	remove: () => void;
	loading: boolean;
}) {
	const {
		fields,
		append,
		remove: removeTask,
	} = useFieldArray({
		control: form.control,
		name: `researchAims.${index}.tasks`,
	});

	return (
		<AccordionItem value={`aim-${index}`}>
			<AccordionTrigger className="text-xl font-semibold">Research Aim {index + 1}</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-6 p-6 border rounded-lg">
					<div className="flex justify-between items-center">
						<h3 className="text-xl font-semibold">Research Aim {index + 1}</h3>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={remove}
							disabled={index === 0 && form.getValues().researchAims.length === 1}
							data-testid={`remove-aim-button-${index}`}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Aim
						</Button>
					</div>
					<FormField
						control={form.control}
						name={`researchAims.${index}.title`}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`researchAims.${index}.title`}
										className="text-xl"
										data-testid={`research-aim-form-title-label-${index}`}
									>
										Research Aim Title
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`research-aim-form-title-help-${index}`}
												aria-label="Research Aim Title information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid={`research-aim-form-title-tooltip-${index}`}
											role="tooltip"
										>
											Enter the title of the research aim.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Input
										{...field}
										id={`researchAims.${index}.title`}
										disabled={loading}
										placeholder="Enter the Research Aim Title"
										className="transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-title-input-${index}`}
										aria-required="true"
										aria-invalid={!!form.formState.errors.researchAims?.[index]?.title}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`research-aim-title-counter-${index}`}
										data-testid={`research-aim-title-char-count-${index}`}
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											field.value.length < 5 && "text-red-500",
											field.value.length >= 5 && field.value.length <= 255 && "text-green-500",
											field.value.length > 255 && "text-red-500",
										)}
									>
										{field.value.length} characters
										{field.value.length < 5 && ` (${5 - field.value.length} more required)`}
										{field.value.length > 255 && ` (${field.value.length - 255} over limit)`}
									</p>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={`researchAims.${index}.description`}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`researchAims.${index}.description`}
										className="text-xl"
										data-testid={`research-aim-form-description-label-${index}`}
									>
										Research Aim Description
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`research-aim-form-description-help-${index}`}
												aria-label="Research Aim Description information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid={`research-aim-form-description-tooltip-${index}`}
											role="tooltip"
										>
											Enter a description for your research aim
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Textarea
										{...field}
										ref={(textarea) => {
											if (textarea) {
												textarea.style.height = "0px";
												textarea.style.height = `${textarea.scrollHeight}px`;
											}
										}}
										id={`researchAims.${index}.description`}
										disabled={loading}
										placeholder="Enter the Research Aim Description"
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-description-input-${index}`}
										aria-required="true"
										aria-invalid={!!form.formState.errors.researchAims?.[index]?.description}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`research-aim-description-counter-${index}`}
										data-testid={`research-aim-description-char-count-${index}`}
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											"text-green-500",
										)}
									>
										{field.value.length} characters
									</p>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={`researchAims.${index}.requiresClinicalTrials`}
						render={({ field }) => (
							<FormItem className="flex flex-row items-center space-x-2">
								<FormControl>
									<Checkbox
										id={`researchAims.${index}.requiresClinicalTrials`}
										disabled={loading}
										checked={field.value}
										onCheckedChange={field.onChange}
										className="h-5 w-5 transition-all duration-200 focus:ring-2 focus:ring-primary"
										aria-describedby={`requires-clinical-trials-label-${index} requires-clinical-trials-tooltip-${index}`}
										data-testid={`research-aim-form-clinical-trials-checkbox-${index}`}
									/>
								</FormControl>
								<div className="flex items-center space-x-2">
									<FormLabel
										id={`requires-clinical-trials-label-${index}`}
										htmlFor={`researchAims.${index}.requiresClinicalTrials`}
										className="text-sm font-medium cursor-pointer"
										data-testid={`research-aim-form-clinical-trials-label-${index}`}
									>
										Requires Clinical Trials
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`research-aim-form-clinical-trials-help-${index}`}
												aria-label="Clinical Trials information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											id={`requires-clinical-trials-tooltip-${index}`}
											role="tooltip"
											data-testid={`research-aim-form-clinical-trials-tooltip-${index}`}
										>
											Check this box if your research aim requires clinical trials.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h4 className="text-lg font-semibold">Research Tasks</h4>
							<Button
								type="button"
								onClick={() => {
									append({ title: "", description: "" });
								}}
								data-testid={`add-task-button-${index}`}
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Task
							</Button>
						</div>
						<Accordion type="single" collapsible className="w-full">
							{fields.map((field, taskIndex) => (
								<ResearchTaskForm
									key={taskIndex.toString() + field.id}
									form={form}
									aimIndex={index}
									taskIndex={taskIndex}
									remove={() => {
										removeTask(taskIndex);
									}}
									loading={loading}
								/>
							))}
						</Accordion>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

export function ResearchPlanForm({
	workspaceId,
	applicationId,
	onPressPrevious,
	onPressNext,
}: {
	workspaceId: string;
	applicationId: string;
	onPressNext: () => void;
	onPressPrevious: () => void;
}) {
	const [canSubmit, setCanSubmit] = useState(false);
	const [canContinue, setCanContinue] = useState(false);
	const {
		updateResearchAim,
		updateResearchTask,
		loading,
		researchAims,
		researchTasks,
		applicationFiles,
		updateFiles,
	} = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			updateResearchAim: state.updateResearchAim,
			updateResearchTask: state.updateResearchTask,
			researchAims: state.researchAims,
			researchTasks: state.researchTasks,
			loading: state.loading,
			applicationFiles: state.files,
			updateFiles: state.updateFiles,
		})),
	);

	const researchAimsIdMap = useMemo(
		() =>
			researchAims.reduce<Record<string, ResearchAim>>((acc, aim) => {
				acc[aim.id] = aim;
				return acc;
			}, {}),
		[researchAims],
	);

	const researchTasksIdMap = useMemo(
		() =>
			researchTasks.reduce<Record<string, ResearchTask>>((acc, task) => {
				acc[task.id] = task;
				return acc;
			}, {}),
		[researchTasks],
	);

	const form = useForm<ResearchPlanFormValues>({
		resolver: zodResolver(researchPlanFormSchema),
		defaultValues: {
			files: applicationFiles
				.filter((file) => file.section === "research-plan")
				.map(({ name, size, type }) => ({
					name,
					size,
					type,
				})),
			researchAims: researchAims.length
				? researchAims.map(({ id, ...aim }) => ({
						...aim,
						id,
						tasks: researchTasks.filter((task) => task.aimId === id),
					}))
				: [
						{
							title: "",
							description: "",
							requiresClinicalTrials: false,
							tasks: [{ title: "", description: "" }],
						},
					],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "researchAims",
	});

	const onSubmit = async (values: ResearchPlanFormValues) => {
		const promises: Promise<unknown>[] = values.researchAims.map(
			async ({ tasks, title: aimTitle, description: aimDescription, ...aim }) => {
				const upsertedAim = await updateResearchAim({
					...aim,
					title: aimTitle.trim(),
					description: aimDescription?.trim() ?? "",
					applicationId,
				});

				if (upsertedAim) {
					const taskPromises = tasks.map(
						async ({ id: taskId, title: taskTitle, description: taskDescription }) => {
							await updateResearchTask({
								id: taskId,
								aimId: upsertedAim.id,
								title: taskTitle.trim(),
								description: taskDescription?.trim() ?? "",
							});
						},
					);

					await Promise.all(taskPromises);
				}
			},
		);
		const filesToUpload = values.files.filter((file) => file instanceof File);
		if (filesToUpload.length) {
			const uploadedFilesData = await uploadFiles({
				applicationId,
				workspaceId,
				sectionName: "research-plan",
				files: filesToUpload,
			});
			promises.push(updateFiles(uploadedFilesData));
		}

		await Promise.all(promises);
		onPressNext();
	};

	form.watch((values) => {
		const researchAimValues = (values.researchAims?.filter(Boolean) ?? []) as z.infer<typeof researchAimSchema>[];
		const files = values.files ?? [];
		const hasFullAims =
			researchAimValues.length > 0 &&
			researchAimValues.every(
				(aim) =>
					aim.title &&
					aim.title.length >= 5 &&
					aim.tasks.length &&
					aim.tasks.every((task) => task.title && task.title.length >= 5),
			);

		if (!hasFullAims) {
			setCanContinue(false);
			setCanSubmit(false);
			return;
		}

		setCanContinue(true);

		const researchAimsWithID = researchAimValues.filter((aim) => !!aim.id);
		const hasChangedAimsOrTasks =
			researchAimsWithID.length === 0 ||
			researchAimsWithID.some((aim) => {
				const dbAim = researchAimsIdMap[aim.id!] as ResearchAim | undefined;
				if (dbAim) {
					const valueChanged =
						aim.title !== dbAim.title ||
						aim.description !== dbAim.description ||
						aim.requiresClinicalTrials !== dbAim.requiresClinicalTrials;

					const tasksChanged = aim.tasks
						.filter((task) => task.id)
						.some((task) => {
							const dbTask = researchTasksIdMap[task.id!] as ResearchTask | undefined;
							if (dbTask) {
								return task.title !== dbTask.title || task.description !== dbTask.description;
							}
							return true;
						});
					return valueChanged || tasksChanged;
				}
			});
		const sectionFiles = applicationFiles.filter((file) => file.section === "research-plan");
		const hasDifferentFiles =
			files.length !== sectionFiles.length ||
			files.some(
				(file) =>
					file &&
					!sectionFiles.some((f) => f.name === file.name && f.size === file.size && f.type === file.type),
			);

		setCanSubmit(hasChangedAimsOrTasks || hasDifferentFiles);
	});

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-6"
					data-testid="research-plan-form"
					aria-label="Research Plan Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FormField
						control={form.control}
						name="files"
						render={({ field }) => (
							<FormItem>
								<FilesDisplay
									files={field.value}
									onFileRemoved={(file) => {
										field.onChange(field.value.filter((f) => f !== file));
									}}
								/>
								<FormControl>
									<FileUploader
										currentFileCount={field.value.length}
										onFilesAdded={(newFiles) => {
											field.onChange([...field.value, ...newFiles]);
										}}
										data-testid="research-plan-files-input"
										fieldName={field.name}
										isDropZone={true}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<Accordion type="single" collapsible className="w-full">
						{fields.map((field, index) => (
							<ResearchAimForm
								key={index.toString() + field.id}
								form={form}
								index={index}
								remove={() => {
									remove(index);
								}}
								loading={loading}
							/>
						))}
					</Accordion>
					<Button
						type="button"
						onClick={() => {
							append({
								title: "",
								description: "",
								requiresClinicalTrials: false,
								tasks: [{ title: "", description: "" }],
							});
						}}
						data-testid="add-research-aim-button"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Research Aim
					</Button>
					<div className="pt-10 flex justify-between">
						<Button onClick={onPressPrevious} type="button">
							Go Back
						</Button>
						{canSubmit ? (
							<SubmitButton
								disabled={!form.formState.isValid || !canSubmit}
								isLoading={loading}
								data-testid="research-plan-form-submit"
								aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
								aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							>
								Save and Continue
							</SubmitButton>
						) : (
							<Button
								onClick={onPressNext}
								disabled={!canContinue}
								data-testid="significance-innovation-form-continue-button"
								aria-label="Continue to the next step"
							>
								Continue
							</Button>
						)}
					</div>
					{form
						.getValues()
						.researchAims.filter((aim) => !!aim.id)
						.map((aim, aimIndex) => (
							<Fragment key={`aim-fragment-${aim.id}`}>
								<input
									key={aim.id}
									type="hidden"
									value={aim.id}
									{...form.register(`researchAims.${aimIndex}.id`)}
								/>
								<Fragment key={`task-fragment-${aim.id}`}>
									{aim.tasks
										.filter((task) => !!task.id)
										.map((task, taskIndex) => (
											<input
												key={task.id}
												type="hidden"
												value={task.id}
												{...form.register(`researchAims.${aimIndex}.tasks.${taskIndex}.id`)}
											/>
										))}
								</Fragment>
							</Fragment>
						))}
				</form>
			</Form>
		</TooltipProvider>
	);
}
