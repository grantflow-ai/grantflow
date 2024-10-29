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
import { uploadFiles } from "@/actions/file";
import { FileUploader } from "@/components/file-uploader";
import { FilesDisplay } from "@/components/files-display";
import { cn } from "gen/cn";

const researchTaskSchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().min(20, "Description must be at least 20 characters"),
	files: z.array(z.custom<File>()),
});

const researchAimSchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().min(20, "Description must be at least 20 characters"),
	requiresClinicalTrials: z.boolean().optional(),
	files: z.array(z.custom<File>()),
	tasks: z.array(researchTaskSchema).min(1, "At least one research task is required"),
});

const researchPlanFormSchema = z.object({
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
							<FormLabel data-testid={`task-title-label-${aimIndex}-${taskIndex}`}>Task Title</FormLabel>
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
								<TooltipContent role="tooltip">Enter the title of the research task.</TooltipContent>
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
							<FormLabel data-testid={`task-description-label-${aimIndex}-${taskIndex}`}>
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
									field.value.length < 20 && "text-red-500",
									field.value.length >= 20 && "text-green-500",
								)}
							>
								{field.value.length} characters
								{field.value.length < 20 && ` (${20 - field.value.length} more required)`}
							</p>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name={`researchAims.${aimIndex}.tasks.${taskIndex}.files`}
				render={({ field }) => (
					<FormItem>
						<FormLabel data-testid={`task-files-label-${aimIndex}-${taskIndex}`}>Task Files</FormLabel>
						<FilesDisplay
							files={field.value}
							onFileRemoved={(files) => {
								field.onChange(files);
							}}
						/>
						<FormControl>
							<FileUploader
								currentFileCount={field.value.length}
								onFilesAdded={(files) => {
									field.onChange(files);
								}}
								data-testid={`task-files-input-${aimIndex}-${taskIndex}`}
								fieldName={field.name}
							/>
						</FormControl>
					</FormItem>
				)}
			/>
		</div>
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
								className="flex items-center gap-2"
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
								<TooltipContent data-testid={`research-aim-form-title-tooltip-${index}`} role="tooltip">
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
								className="flex items-center gap-2"
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
									field.value.length < 20 && "text-red-500",
									field.value.length >= 20 && "text-green-500",
								)}
							>
								{field.value.length} characters
								{field.value.length < 20 && ` (${20 - field.value.length} more required)`}
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
								This is a Re-Submission
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										className="p-0 h-4 w-4"
										data-testid={`research-aim-form-clinical-trials-help-${index}`}
										aria-label="Resubmission information"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent
									id={`requires-clinical-trials-tooltip-${index}`}
									role="tooltip"
									data-testid={`research-aim-form-clinical-trials-tooltip-${index}`}
								>
									Check this box if you are resubmitting a previously submitted grant application
								</TooltipContent>
							</Tooltip>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name={`researchAims.${index}.files`}
				render={({ field }) => (
					<FormItem>
						<FormLabel data-testid={`research-aim-form-files-label-${index}`}>Research Aim Files</FormLabel>
						<FilesDisplay
							files={field.value}
							onFileRemoved={(files) => {
								field.onChange(files);
							}}
						/>
						<FormControl>
							<FileUploader
								currentFileCount={field.value.length}
								onFilesAdded={(files) => {
									field.onChange(files);
								}}
								data-testid={`research-aim-form-files-input-${index}`}
								fieldName={field.name}
							/>
						</FormControl>
					</FormItem>
				)}
			/>

			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h4 className="text-lg font-semibold">Research Tasks</h4>
					<Button
						type="button"
						onClick={() => {
							append({ title: "", description: "", files: [] });
						}}
						data-testid={`add-task-button-${index}`}
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Task
					</Button>
				</div>
				{fields.map((field, taskIndex) => (
					<ResearchTaskForm
						key={field.id}
						form={form}
						aimIndex={index}
						taskIndex={taskIndex}
						remove={() => {
							removeTask(taskIndex);
						}}
						loading={loading}
					/>
				))}
			</div>
		</div>
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
	const { updateResearchAim, updateResearchTask, loading } = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			updateResearchAim: state.updateResearchAim,
			updateResearchTask: state.updateResearchTask,
			loading: state.loading,
		})),
	);

	const form = useForm<ResearchPlanFormValues>({
		resolver: zodResolver(researchPlanFormSchema),
		defaultValues: {
			researchAims: [
				{
					title: "",
					description: "",
					requiresClinicalTrials: false,
					files: [],
					tasks: [{ title: "", description: "", files: [] }],
				},
			],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "researchAims",
	});

	const onSubmit = async (values: ResearchPlanFormValues) => {
		const promises = values.researchAims.map(async ({ files: aimFiles, ...aim }) => {
			const upsertedAim = await updateResearchAim({
				...aim,
				applicationId,
			});

			if (upsertedAim) {
				if (aimFiles.length) {
					const fileMapping = await uploadFiles({
						workspaceId,
						parentId: upsertedAim.id,
						files: aimFiles,
					});
					await updateResearchAim({ ...upsertedAim, files: fileMapping });
				}

				const taskPromises = aim.tasks.map(async ({ files: taskFiles, ...task }) => {
					const upsertedTask = await updateResearchTask({
						...task,
						aimId: upsertedAim.id,
					});

					if (upsertedTask && taskFiles.length) {
						const fileMapping = await uploadFiles({
							workspaceId,
							parentId: upsertedTask.id,
							files: taskFiles,
						});

						await updateResearchTask({ ...upsertedTask, files: fileMapping });
					}
				});

				await Promise.all(taskPromises);
			}
		});

		await Promise.all(promises);
		onPressNext();
	};

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-6"
					data-testid="research-plan-form"
					aria-label="Research Plan Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<div className="space-y-6">
						{fields.map((field, index) => (
							<ResearchAimForm
								key={field.id}
								form={form}
								index={index}
								remove={() => {
									remove(index);
								}}
								loading={loading}
							/>
						))}
					</div>
					<Button
						type="button"
						onClick={() => {
							append({
								title: "",
								description: "",
								requiresClinicalTrials: false,
								files: [],
								tasks: [{ title: "", description: "", files: [] }],
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
						<SubmitButton
							disabled={!form.formState.isValid}
							isLoading={loading}
							data-testid="research-plan-form-submit"
							aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
							aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
						>
							Save and Continue
						</SubmitButton>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
