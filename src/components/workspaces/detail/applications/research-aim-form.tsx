import { useFieldArray, UseFormReturn } from "react-hook-form";
import { GrantApplicationFormValues, MIN_TITLE_LENGTH } from "@/components/workspaces/detail/applications/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "gen/ui/collapsible";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "gen/ui/tooltip";
import { Button } from "gen/ui/button";
import { Input } from "gen/ui/input";
import { cn } from "gen/cn";
import { Textarea } from "gen/ui/textarea";
import { Checkbox } from "gen/ui/checkbox";
import { ResearchTaskForm } from "@/components/workspaces/detail/applications/research-tasks-form";
import { ChevronDown, ChevronUp, HelpCircle, Plus, Trash2 } from "lucide-react";
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
											Enter a description for this research aim. The more details, the better.
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
										placeholder="Describe this research aim."
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
						name={`research_aims.${index}.preliminary_results`}
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`research_aims.${index}.preliminary_results`}
										data-testid={`research-aim-form-preliminary_results-label-${index}`}
									>
										Preliminary Results
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`research-aim-form-preliminary_results-help-${index}`}
												aria-label="Research Aim Preliminary Results"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid={`research-aim-form-preliminary_results-tooltip-${index}`}
											role="tooltip"
										>
											Describe the experiments and analyses conducted in preparation for the
											suggested aim and how their results support the feasibility of achieving
											this aim.
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
										id={`research_aims.${index}.preliminary_results`}
										disabled={loading}
										placeholder="Describe any preliminary results."
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-description-input-${index}`}
										aria-required="true"
										aria-invalid={
											!!form.formState.errors.research_aims?.[index]?.preliminary_results
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`research-aim-preliminary_results-counter-${index}`}
										data-testid={`research-aim-preliminary_results-char-count-${index}`}
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
						name={`research_aims.${index}.risks_and_alternatives`}
						render={({ field }) => (
							<FormItem className="space-y-2">
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor={`research_aims.${index}.risks_and_alternatives`}
										data-testid={`research-aim-form-risks_and_alternatives-label-${index}`}
									>
										Risks and Alternatives
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid={`research-aim-form-risks_and_alternatives-help-${index}`}
												aria-label="Research Aim Preliminary Results"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid={`research-aim-form-risks_and_alternatives-tooltip-${index}`}
											role="tooltip"
										>
											Describe possible major risks that might prevent completing this aim as
											planned. Estimate how serious are those risks. Suggest approaches to
											mitigate those risks and possible alternative approaches to complete the aim
											in case the risks materialize. Remember: mentioning major risks without
											alternatives to them could be detrimental.
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
										id={`research_aims.${index}.risks_and_alternatives`}
										disabled={loading}
										placeholder="Describe any risks and alternatives to this research aim."
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid={`research-aim-form-description-input-${index}`}
										aria-required="true"
										aria-invalid={
											!!form.formState.errors.research_aims?.[index]?.risks_and_alternatives
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id={`research-aim-risks_and_alternatives-counter-${index}`}
										data-testid={`research-aim-risks_and_alternatives-char-count-${index}`}
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
