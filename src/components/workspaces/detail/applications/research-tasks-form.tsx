import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "gen/ui/tooltip";
import { Button } from "gen/ui/button";
import { ChevronDown, ChevronUp, HelpCircle, Trash2 } from "lucide-react";
import { Input } from "gen/ui/input";
import { cn } from "gen/cn";
import { Textarea } from "gen/ui/textarea";
import { GrantApplicationFormValues, MIN_TITLE_LENGTH } from "@/components/workspaces/detail/applications/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "gen/ui/collapsible";
import React, { useState } from "react";

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
