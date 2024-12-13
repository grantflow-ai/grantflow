import { useFieldArray, UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "gen/ui/tooltip";
import { Button } from "gen/ui/button";
import { ChevronDown, ChevronUp, HelpCircle, Plus, Trash2 } from "lucide-react";
import { Input } from "gen/ui/input";
import { cn } from "gen/cn";
import { Textarea } from "gen/ui/textarea";
import { Checkbox } from "gen/ui/checkbox";
import { GrantApplicationFormValues, MIN_TITLE_LENGTH } from "@/components/workspaces/detail/applications/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "gen/ui/collapsible";
import React, { useState } from "react";

export function ResearchAimForm({
	form,
	index,
	onClickRemove,
	loading,
}: {
	form: UseFormReturn<GrantApplicationFormValues>;
	index: number;
	onClickRemove: () => void;
	loading: boolean;
}) {
	const [isOpen, setIsOpen] = useState(true);
	const {
		fields,
		append,
		remove: removeTask,
	} = useFieldArray({
		control: form.control,
		name: `research_aims.${index}.research_tasks`,
	});

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-4">
			<CollapsibleTrigger className="w-full text-left px-4 py-2 hover:bg-muted/50 flex items-center justify-between">
				<span className="text-xl font-semibold">Research Aim {index + 1}</span>
				{isOpen ? (
					<ChevronUp className="h-4 w-4 transition-transform duration-200" />
				) : (
					<ChevronDown className="h-4 w-4 transition-transform duration-200" />
				)}
			</CollapsibleTrigger>
			<CollapsibleContent>
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
											field.value.length < MIN_TITLE_LENGTH && "text-red-500",
											field.value.length >= MIN_TITLE_LENGTH &&
												field.value.length <= 255 &&
												"text-green-500",
											field.value.length > 255 && "text-red-500",
										)}
									>
										{field.value.length} characters
										{field.value.length < MIN_TITLE_LENGTH &&
											` (${MIN_TITLE_LENGTH - field.value.length} more required)`}
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

					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onClickRemove}
							data-testid={`remove-aim-button-${index}`}
							className="w-full mt-2"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Aim
						</Button>
					</div>

					<div className="space-y-4">
						<h4 className="text-lg font-semibold">Research Tasks</h4>
						<div>
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
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function ResearchTaskForm({
	form,
	aimIndex,
	taskIndex,
	onClickRemove,
	loading,
}: {
	form: UseFormReturn<GrantApplicationFormValues>;
	aimIndex: number;
	taskIndex: number;
	onClickRemove: () => void;
	loading: boolean;
}) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-4">
			<CollapsibleTrigger className="w-full text-left px-4 py-2 hover:bg-muted/50 flex items-center justify-between">
				<span className="text-lg font-semibold">
					Research Task {aimIndex + 1}.{taskIndex + 1}
				</span>
				{isOpen ? (
					<ChevronUp className="h-4 w-4 transition-transform duration-200" />
				) : (
					<ChevronDown className="h-4 w-4 transition-transform duration-200" />
				)}
			</CollapsibleTrigger>
			<CollapsibleContent>
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
										{field.value.length < MIN_TITLE_LENGTH &&
											` (${MIN_TITLE_LENGTH - field.value.length} more required)`}
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
							className="w-full mt-2"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Task
						</Button>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
