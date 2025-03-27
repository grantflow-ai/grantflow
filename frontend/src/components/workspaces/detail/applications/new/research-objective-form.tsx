import { MIN_TITLE_LENGTH, NewGrantWizardFormValues } from "@/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Trash2 } from "lucide-react";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ResearchTaskTabs } from "./research-task-tabs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CharacterCount } from "@/components/character-count";

export function ResearchObjectiveForm({
	form,
	index,
	loading,
	onClickRemove,
}: {
	form: UseFormReturn<NewGrantWizardFormValues>;
	index: number;
	loading: boolean;
	onClickRemove: () => void;
}) {
	return (
		<div className="relative border rounded-lg p-6 mb-6" data-testid={`research-objective-form-${index}`}>
			<div className="space-y-6">
				<FormField
					control={form.control}
					name={`research_objectives.${index}.title`}
					render={({ field }) => (
						<FormItem className="space-y-2">
							<div className="flex items-center gap-2">
								<FormLabel
									data-testid={`research-objective-form-title-label-${index}`}
									htmlFor={`research_objectives.${index}.title`}
								>
									Research Objective Title <span className="text-red-300 p-0">*</span>
								</FormLabel>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											aria-label="Research Objective Title information"
											className="p-0 h-4 w-4"
											data-testid={`research-objective-form-title-help-${index}`}
											type="button"
											variant="ghost"
										>
											<HelpCircle className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										data-testid={`research-objective-form-title-tooltip-${index}`}
										role="tooltip"
									>
										Enter the title of the research objective.
									</TooltipContent>
								</Tooltip>
							</div>
							<FormControl>
								<Input
									{...field}
									aria-invalid={!!form.formState.errors.research_objectives?.[index]?.title}
									aria-required="true"
									className="transition-all duration-200 focus:ring-2 focus:ring-primary"
									data-testid={`research-objective-form-title-input-${index}`}
									disabled={loading}
									id={`research_objectives.${index}.title`}
									onChange={(e) => {
										field.onChange(e);
										form.setValue(`research_objectives.${index}.title`, e.target.value);
									}}
									placeholder="Enter the Research Objective Title"
								/>
							</FormControl>
							{field.value && (
								<CharacterCount
									className="text-muted-foreground"
									maxLength={255}
									minLength={MIN_TITLE_LENGTH}
									value={field.value}
								/>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name={`research_objectives.${index}.description`}
					render={({ field }) => (
						<FormItem className="space-y-2">
							<div className="flex items-center gap-2">
								<FormLabel
									data-testid={`research-objective-form-description-label-${index}`}
									htmlFor={`research_objectives.${index}.description`}
								>
									Research Objective Description
								</FormLabel>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											aria-label="Research Objective Description information"
											className="p-0 h-4 w-4"
											data-testid={`research-objective-form-description-help-${index}`}
											type="button"
											variant="ghost"
										>
											<HelpCircle className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										data-testid={`research-objective-form-description-tooltip-${index}`}
										role="tooltip"
									>
										Enter a description for this research objective. The more details, the better.
									</TooltipContent>
								</Tooltip>
							</div>
							<FormControl>
								<Textarea
									{...field}
									aria-invalid={!!form.formState.errors.research_objectives?.[index]?.description}
									aria-required="true"
									className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
									data-testid={`research-objective-form-description-input-${index}`}
									disabled={loading}
									id={`research_objectives.${index}.description`}
									onChange={(e) => {
										field.onChange(e);
									}}
									placeholder="Describe this research objective."
									ref={(textarea) => {
										if (textarea) {
											textarea.style.height = "0px";
											textarea.style.height = `${textarea.scrollHeight}px`;
										}
									}}
									value={field.value ?? ""}
								/>
							</FormControl>
							{field.value && (
								<p
									aria-live="polite"
									className={cn(
										"text-xs text-muted-foreground transition-colors duration-200",
										"text-green-500",
									)}
									data-testid={`research-objective-description-char-count-${index}`}
									id={`research-objective-description-counter-${index}`}
								>
									{field.value.length} characters
								</p>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="space-y-4">
					<h4 className="text-lg font-semibold">Research Tasks</h4>
					<ResearchTaskTabs form={form} loading={loading} objectiveIndex={index} />
				</div>

				<div className="flex justify-end">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								className="absolute top-2 right-2"
								data-testid={`remove-objective-button-${index}`}
								size="icon"
								variant="ghost"
							>
								<Trash2 className="h-5 w-5" />
								<span className="sr-only">Remove Objective</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete this research objective
									and all its tasks.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={onClickRemove}>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
