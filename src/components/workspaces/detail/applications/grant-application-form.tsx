import { Fragment, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Button } from "gen/ui/button";
import { Check, ChevronsUpDown, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "gen/ui/command";
import { cn } from "gen/cn";
import { Input } from "gen/ui/input";
import { FilesDisplay } from "@/components/files-display";
import { FileUploader } from "@/components/file-uploader";
import { Textarea } from "gen/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import * as z from "zod";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateGrantApplicationRequestBody, GrantApplicationDetail, GrantCfp, ResearchAim } from "@/types/api-types";
import { Checkbox } from "gen/ui/checkbox";
import { FormFile, OmitId } from "@/types/app-types";
import { getApiClient } from "@/utils/api-client";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";

const MIN_TITLE_LENGTH = 10;

const researchTaskSchema = z.object({
	id: z.string().optional(),
	task_number: z.number(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
});

const researchAimSchema = z.object({
	id: z.string().optional(),
	aim_number: z.number(),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	description: z.string().optional(),
	requires_clinical_trials: z.boolean().default(false),
	research_tasks: z.array(researchTaskSchema).min(1, "At least one research task is required"),
});

const formSchema = z.object({
	application_files: z.array(z.custom<FormFile>()),
	cfp_id: z.string({
		required_error: "Please select an NIH Activity Code",
	}),
	title: z
		.string()
		.min(MIN_TITLE_LENGTH, `Title must be at least ${MIN_TITLE_LENGTH} characters`)
		.max(255, "Title must not exceed 255 characters"),
	significance: z.string().optional(),
	innovation: z.string().optional(),
	research_aims: z.array(researchAimSchema).min(1, "At least one research aim is required"),
});

type FormValues = z.infer<typeof formSchema>;

async function handleCreateApplication({ workspaceId, formData }: { workspaceId: string; formData: FormValues }) {
	const apiClient = getApiClient();
	const { id } = await apiClient.createApplication(workspaceId, {
		title: formData.title,
		cfp_id: formData.cfp_id,
		significance: formData.significance,
		innovation: formData.innovation,
	} satisfies CreateGrantApplicationRequestBody);

	await apiClient.createResearchAims(workspaceId, id, formData.research_aims as OmitId<ResearchAim>[]);

	if (formData.application_files.length) {
		await apiClient.uploadApplicationFiles(workspaceId, id, formData.application_files as File[]);
	}

	return id;
}

export function GrantApplicationForm({
	cfps,
	workspaceId,
}: {
	cfps: GrantCfp[];
	application?: GrantApplicationDetail;
	workspaceId: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [title, setTitle] = useState("Select an NIH Activity Code");

	const onSubmit = async (values: FormValues) => {
		setLoading(true);
		try {
			const applicationId = await handleCreateApplication({
				workspaceId,
				formData: values,
			});
			router.push(
				PagePath.APPLICATION_DETAIL.replace(":workspaceId", workspaceId).replace(
					":applicationId",
					applicationId,
				),
			);
		} catch {
			toast.error("An error occurred.");
		} finally {
			setLoading(false);
		}
	};

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			application_files: [],
			cfp_id: "",
			title: "",
			research_aims: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "research_aims",
	});

	const setCfpTitle = (cfpId: string) => {
		const cfp = cfps.find((cfp) => cfp.id === cfpId);
		setTitle(cfp ? `${cfp.code} - ${cfp.title}` : "Select an NIH Activity Code");
	};

	form.watch(({ cfp_id }) => {
		if (cfp_id) {
			setCfpTitle(cfp_id);
		} else {
			setTitle("Select an NIH Activity Code");
		}
	});

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-8 max-w-3xl mx-auto"
					data-testid="grant-application-form"
					aria-label="Grant Application Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<div className="space-y-6">
						<section className="space-y-4">
							<h2 className="text-2xl font-bold">Knowledge Base</h2>
							<FormField
								control={form.control}
								name="application_files"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<FileUploader
												currentFileCount={field.value.length}
												onFilesAdded={(newFiles) => {
													field.onChange([...field.value, ...newFiles]);
												}}
												data-testid="significance-and-innovation-files-input"
												fieldName={field.name}
												isDropZone={true}
											/>
										</FormControl>
										<FilesDisplay
											files={field.value}
											onFileRemoved={(file) => {
												field.onChange(field.value.filter((f) => f !== file));
											}}
										/>
									</FormItem>
								)}
							/>
						</section>
						<section className="space-y-4">
							<h2 className="text-2xl font-bold">Grant Details</h2>
							<FormField
								control={form.control}
								name="cfp_id"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<div className="flex items-center gap-2">
											<FormLabel htmlFor="cfp_id" data-testid="grant-application-form-cfp-label">
												NIH Activity Code <span className="text-red-300 p-0">*</span>
											</FormLabel>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														className="p-0 h-4 w-4"
														data-testid="grant-application-form-cfp-help"
														aria-label="NIH Activity Code information"
													>
														<HelpCircle className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent
													data-testid="grant-application-form-cfp-tooltip"
													role="tooltip"
												>
													Select the appropriate NIH Activity Code for your grant application
												</TooltipContent>
											</Tooltip>
										</div>
										<FormControl>
											<Popover open={open} onOpenChange={setOpen}>
												<PopoverTrigger asChild>
													<Button
														id="cfp_id"
														variant="outline"
														role="combobox"
														aria-expanded={open}
														aria-haspopup="listbox"
														aria-controls="cfp-options"
														aria-label="Select NIH Activity Code"
														className="w-full justify-between"
														type="button"
														data-testid="grant-application-form-cfp-select"
													>
														{title}
														<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-full max-w-md p-0">
													<Command>
														<CommandInput
															disabled={loading}
															placeholder="Search NIH Activity Codes..."
															data-testid="grant-application-form-cfp-search"
															aria-label="Search NIH Activity Codes"
														/>
														<CommandEmpty
															data-testid="grant-application-form-cfp-empty"
															role="status"
														>
															No activity code found.
														</CommandEmpty>
														<CommandGroup className="max-h-60 overflow-y-auto">
															<CommandList id="cfp-options" role="listbox">
																{cfps.map((cfp) => (
																	<CommandItem
																		key={cfp.id}
																		value={cfp.id}
																		onSelect={(currentValue) => {
																			field.onChange(currentValue);
																			setOpen(false);
																		}}
																		role="option"
																		aria-selected={field.value === cfp.id}
																		data-testid={`grant-application-form-cfp-option-${cfp.code}`}
																	>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				field.value === cfp.id
																					? "opacity-100"
																					: "opacity-0",
																			)}
																			aria-hidden="true"
																		/>
																		<span className="font-medium">{cfp.code}</span>
																		<span className="ml-2 text-sm text-muted-foreground truncate">
																			{cfp.title}
																		</span>
																	</CommandItem>
																))}
															</CommandList>
														</CommandGroup>
													</Command>
												</PopoverContent>
											</Popover>
										</FormControl>
										{form.formState.errors.cfp_id?.message && (
											<FormMessage
												data-testid="grant-application-form-cfp-error"
												className="text-destructive"
												role="alert"
											>
												{form.formState.errors.cfp_id.message}
											</FormMessage>
										)}
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<div className="flex items-center gap-2">
											<FormLabel htmlFor="title" data-testid="grant-application-form-title-label">
												Grant Application Title <span className="text-red-300 p-0">*</span>
											</FormLabel>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														className="p-0 h-4 w-4"
														data-testid="grant-application-form-title-help"
														aria-label="Grant title information"
													>
														<HelpCircle className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent
													data-testid="grant-application-form-title-tooltip"
													role="tooltip"
												>
													Enter a descriptive title for your grant application
												</TooltipContent>
											</Tooltip>
										</div>
										<FormControl>
											<Input
												{...field}
												id="title"
												disabled={loading}
												placeholder="Enter the Grant Application Title"
												className="transition-all duration-200 focus:ring-2 focus:ring-primary"
												data-testid="grant-application-form-title-input"
												aria-required="true"
												aria-invalid={!!form.formState.errors.title}
												aria-describedby={
													form.formState.errors.title
														? "title-error title-counter"
														: "title-counter"
												}
											/>
										</FormControl>
										{field.value && (
											<p
												id="title-counter"
												className={cn(
													"text-xs text-muted-foreground transition-colors duration-200",
													field.value.length < 10 && "text-red-500",
													field.value.length >= 10 &&
														field.value.length <= 255 &&
														"text-green-500",
												)}
												data-testid="grant-application-form-title-char-count"
												aria-live="polite"
											>
												{field.value.length}/255 characters
												{field.value.length < 10
													? ` (${10 - field.value.length} more required)`
													: ""}
											</p>
										)}
										{form.formState.errors.title?.message && (
											<FormMessage
												id="title-error"
												data-testid="grant-application-form-title-error"
												className="text-destructive"
												role="alert"
											>
												{form.formState.errors.title.message}
											</FormMessage>
										)}
									</FormItem>
								)}
							/>
						</section>
						<section className="space-y-4">
							<h2 className="text-2xl font-bold">Research Overview</h2>
							<FormField
								control={form.control}
								name="significance"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<div className="flex items-center gap-2">
											<FormLabel
												htmlFor="significance"
												data-testid="significance-innovation-form-significance-label"
											>
												Research Significance
											</FormLabel>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														className="p-0 h-4 w-4"
														data-testid="significance-innovation-form-significance-help"
														aria-label="Research significance information"
													>
														<HelpCircle className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent
													data-testid="significance-innovation-form-significance-tooltip"
													role="tooltip"
												>
													Explain the importance of the problem or critical barrier that your
													project addresses, and how it impacts human lives.
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
												id="significance.text"
												disabled={loading}
												placeholder="Describe the significance of your research"
												className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
												data-testid="significance-innovation-form-significance-input"
												aria-required="true"
												aria-invalid={!!form.formState.errors.significance}
												aria-describedby={
													form.formState.errors.significance
														? "significance-error significance-counter"
														: "significance-counter"
												}
											/>
										</FormControl>
										{field.value && (
											<p
												id="significance-counter"
												data-testid="significance-innovation-form-significance-char-count"
												aria-live="polite"
												className={cn(
													"text-xs text-muted-foreground transition-colors duration-200",
													"text-green-500",
												)}
											>
												{field.value.length} characters
											</p>
										)}
										{form.formState.errors.significance?.message && (
											<FormMessage
												id="significance-error"
												data-testid="significance-innovation-form-significance-error"
												className="text-destructive"
												role="alert"
											>
												{form.formState.errors.significance.message}
											</FormMessage>
										)}
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="innovation"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<div className="flex items-center gap-2">
											<FormLabel
												htmlFor="innovation"
												data-testid="significance-innovation-form-innovation-label"
											>
												Research Innovation
											</FormLabel>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														className="p-0 h-4 w-4"
														data-testid="significance-innovation-form-innovation-help"
														aria-label="Research innovation information"
													>
														<HelpCircle className="h-4 w-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent
													data-testid="significance-innovation-form-innovation-tooltip"
													role="tooltip"
												>
													Describe the novel aspects of your project and how it challenges or
													shifts current research or clinical practice paradigms.
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
												id="innovation.text"
												disabled={loading}
												placeholder="Describe the innovation of your research"
												className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
												data-testid="significance-innovation-form-innovation-input"
												aria-required="true"
												aria-invalid={!!form.formState.errors.innovation}
												aria-describedby={
													form.formState.errors.innovation
														? "innovation-error innovation-counter"
														: "innovation-counter"
												}
											/>
										</FormControl>
										{field.value && (
											<p
												id="innovation-counter"
												data-testid="significance-innovation-form-innovation-char-count"
												aria-live="polite"
												className={cn(
													"text-xs text-muted-foreground transition-colors duration-200",
													"text-green-500",
												)}
											>
												{field.value.length} characters
											</p>
										)}
										{form.formState.errors.innovation?.message && (
											<FormMessage
												id="innovation-error"
												data-testid="significance-innovation-form-innovation-error"
												className="text-destructive"
												role="alert"
											>
												{form.formState.errors.innovation.message}
											</FormMessage>
										)}
									</FormItem>
								)}
							/>
						</section>
						<section className="space-y-4">
							<h2 className="text-2xl font-bold">Research Aims</h2>
							<Accordion type="single" collapsible className="w-full" defaultValue="aim-0">
								{fields.map((field, index) => (
									<ResearchAimForm
										key={index.toString() + field.id}
										form={form}
										index={index}
										onClickRemove={() => {
											remove(index);
										}}
										loading={loading}
									/>
								))}
							</Accordion>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									append({
										title: "",
										aim_number: form.getValues().research_aims.length + 1,
										description: "",
										requires_clinical_trials: false,
										research_tasks: [
											{
												title: "",
												description: "",
												task_number: 1,
											},
										],
									});
								}}
								className="w-full"
								data-testid="add-research-aim-button"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Research Aim
							</Button>
							{form.getValues().research_aims.map((aim, aimIndex) => (
								<Fragment key={`aim-fragment-${aim.id ?? aim.aim_number}`}>
									{aim.id && (
										<input
											key={aim.id}
											type="hidden"
											value={aim.id}
											{...form.register(`research_aims.${aimIndex}.id`)}
										/>
									)}
									<input
										key={aim.aim_number}
										type="hidden"
										value={aim.aim_number}
										{...form.register(`research_aims.${aimIndex}.aim_number`)}
									/>
									<Fragment key={`tasks-fragment-${aim.id ?? aim.aim_number}`}>
										{aim.research_tasks.map((task, taskIndex) => (
											<Fragment key={`task-fragment-${task.id ?? task.task_number}`}>
												{task.id && (
													<input
														key={task.id}
														type="hidden"
														value={task.id}
														{...form.register(
															`research_aims.${aimIndex}.research_tasks.${taskIndex}.id`,
														)}
													/>
												)}
												<input
													key={`${aim.aim_number}.${task.task_number}`}
													type="hidden"
													value={task.task_number}
													{...form.register(
														`research_aims.${aimIndex}.research_tasks.${taskIndex}.task_number`,
													)}
												/>
											</Fragment>
										))}
									</Fragment>
								</Fragment>
							))}
						</section>
					</div>
					<div className="pt-6 border-t flex justify-end">
						<SubmitButton
							disabled={!form.formState.isValid || loading}
							isLoading={loading}
							data-testid="grant-application-form-submit"
							aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
							aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							className="w-full sm:w-auto"
						>
							Save and Continue
						</SubmitButton>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}

export function ResearchAimForm({
	form,
	index,
	onClickRemove,
	loading,
}: {
	form: UseFormReturn<FormValues>;
	index: number;
	onClickRemove: () => void;
	loading: boolean;
}) {
	const {
		fields,
		append,
		remove: removeTask,
	} = useFieldArray({
		control: form.control,
		name: `research_aims.${index}.research_tasks`,
	});

	return (
		<AccordionItem value={`aim-${index}`} className="border rounded-lg mb-4">
			<AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
				<span className="text-xl font-semibold">Research Aim {index + 1}</span>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-6 p-4">
					<FormField
						control={form.control}
						name={`research_aims.${index}.title`}
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`research_aims.${index}.title`}
										data-testid={`research-aim-form-title-label-${index}`}
									>
										Research Aim Title <span className="text-red-300 p-0">*</span>
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
										id={`research_aims.${index}.title`}
										disabled={loading}
										placeholder="Enter the Research Aim Title"
										className="transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-title-input-${index}`}
										aria-required="true"
										aria-invalid={!!form.formState.errors.research_aims?.[index]?.title}
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
						name={`research_aims.${index}.description`}
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`research_aims.${index}.description`}
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
										id={`research_aims.${index}.description`}
										disabled={loading}
										placeholder="Enter the Research Aim Description"
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-description-input-${index}`}
										aria-required="true"
										aria-invalid={!!form.formState.errors.research_aims?.[index]?.description}
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
						name={`research_aims.${index}.requires_clinical_trials`}
						render={({ field }) => (
							<FormItem className="space-y-2 flex flex-row items-center space-x-2">
								<FormControl>
									<Checkbox
										id={`research_aims.${index}.requires_clinical_trials`}
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
										htmlFor={`research_aims.${index}.requires_clinical_trials`}
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
						<h4 className="text-lg font-semibold">Research Tasks</h4>
						<Accordion type="single" collapsible className="w-full" defaultValue="task-0">
							{fields.map((field, taskIndex) => (
								<ResearchTaskForm
									key={taskIndex.toString() + field.id}
									form={form}
									aimIndex={index}
									taskIndex={taskIndex}
									onClickRemove={() => {
										removeTask(taskIndex);
									}}
									loading={loading}
								/>
							))}
						</Accordion>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								append({ title: "", description: "", task_number: fields.length + 1 });
							}}
							className="w-full mt-2"
							data-testid={`add-task-button-${index}`}
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Task
						</Button>
					</div>
					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onClickRemove}
							data-testid={`remove-aim-button-${index}`}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Aim
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

export function ResearchTaskForm({
	form,
	aimIndex,
	taskIndex,
	onClickRemove,
	loading,
}: {
	form: UseFormReturn<FormValues>;
	aimIndex: number;
	taskIndex: number;
	onClickRemove: () => void;
	loading: boolean;
}) {
	return (
		<AccordionItem value={`task-${taskIndex}`} className="border rounded-lg mb-4">
			<AccordionTrigger className="px-4 py-2 hover:bg-muted/50">
				<span className="text-lg font-semibold">
					Research Task {aimIndex + 1}.{taskIndex + 1}
				</span>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-4 p-4">
					<FormField
						control={form.control}
						name={`research_aims.${aimIndex}.research_tasks.${taskIndex}.title`}
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex items-center gap-2">
									<FormLabel data-testid={`task-title-label-${aimIndex}-${taskIndex}`}>
										Task Title <span className="text-red-300 p-0">*</span>
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
						name={`research_aims.${aimIndex}.research_tasks.${taskIndex}.description`}
						render={({ field }) => (
							<FormItem className="space-y-2">
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
					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onClickRemove}
							data-testid={`remove-task-button-${aimIndex}-${taskIndex}`}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Task
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
