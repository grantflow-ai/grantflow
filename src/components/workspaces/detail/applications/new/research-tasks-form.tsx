import { MIN_TITLE_LENGTH, NewGrantWizardFormValues } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Trash2 } from "lucide-react";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
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

export function ResearchTaskForm({
	form,
	loading,
	objectiveIndex,
	onClickRemove,
	taskIndex,
}: {
	form: UseFormReturn<NewGrantWizardFormValues>;
	loading: boolean;
	objectiveIndex: number;
	onClickRemove: () => void;
	taskIndex: number;
}) {
	return (
		<div
			className="relative border rounded-lg p-6"
			data-testid={`research-task-form-${objectiveIndex}-${taskIndex}`}
		>
			<div className="space-y-4">
				<FormField
					control={form.control}
					name={`research_objectives.${objectiveIndex}.research_tasks.${taskIndex}.title`}
					render={({ field }) => (
						<FormItem className="space-y-2">
							<div className="flex items-center gap-2">
								<FormLabel data-testid={`task-title-label-${objectiveIndex}-${taskIndex}`}>
									Task {objectiveIndex + 1}.{taskIndex + 1} Title{" "}
									<span className="text-red-300 p-0">*</span>
								</FormLabel>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											aria-label="Task title information"
											className="p-0 h-4 w-4"
											data-testid={`task-title-help-${objectiveIndex}-${taskIndex}`}
											type="button"
											variant="ghost"
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
									data-testid={`task-title-input-${objectiveIndex}-${taskIndex}`}
									disabled={loading}
									onChange={(e) => {
										field.onChange(e);
										form.setValue(
											`research_objectives.${objectiveIndex}.research_tasks.${taskIndex}.title`,
											e.target.value,
										);
									}}
									placeholder={`Enter the title for Task ${objectiveIndex + 1}.${taskIndex + 1}`}
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
					name={`research_objectives.${objectiveIndex}.research_tasks.${taskIndex}.description`}
					render={({ field }) => (
						<FormItem className="space-y-2">
							<div className="flex items-center gap-2">
								<FormLabel data-testid={`task-description-label-${objectiveIndex}-${taskIndex}`}>
									Task Description
								</FormLabel>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											aria-label="Task description information"
											className="p-0 h-4 w-4"
											data-testid={`task-description-help-${objectiveIndex}-${taskIndex}`}
											type="button"
											variant="ghost"
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
									className="min-h-[100px]"
									onChange={(e) => {
										field.onChange(e);
									}}
									placeholder={`Enter the description for Task ${objectiveIndex + 1}.${taskIndex + 1}`}
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
									data-testid={`task-description-char-count-${objectiveIndex}-${taskIndex}`}
									id={`task-description-counter-${objectiveIndex}-${taskIndex}`}
								>
									{field.value.length} characters
								</p>
							)}
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								className="absolute top-2 right-2"
								data-testid={`remove-task-button-${objectiveIndex}-${taskIndex}`}
								size="icon"
								variant="ghost"
							>
								<Trash2 className="h-5 w-5" />
								<span className="sr-only">Remove Task</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete this research task.
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
