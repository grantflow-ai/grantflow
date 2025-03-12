"use client";

import { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, PlusCircle, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NewGrantWizardFormValues } from "@/lib/schema";
import { CharacterCount } from "@/components/character-count";

export function ResearchPlanForm({ form }: { form: UseFormReturn<NewGrantWizardFormValues> }) {
	const [activeObjective, setActiveObjective] = useState("0");
	const [activeTasks, setActiveTasks] = useState<Record<string, string>>({});

	const { fields: objectiveFields } = useFieldArray({
		control: form.control,
		name: "research_objectives",
	});

	const handleRemoveTask = (objectiveIndex: number, taskIndex: number) => {
		const tasks = form.getValues(`research_objectives.${objectiveIndex}.research_tasks`);
		if (tasks.length > 1) {
			const updatedTasks = [...tasks];
			updatedTasks.splice(taskIndex, 1);
			form.setValue(`research_objectives.${objectiveIndex}.research_tasks`, updatedTasks);
		} else {
			// Replace the last task with an empty one
			form.setValue(`research_objectives.${objectiveIndex}.research_tasks`, [
				{ description: "", number: 1, title: "" },
			]);
		}
		setActiveTasks((prev) => ({ ...prev, [objectiveIndex]: Math.max(0, taskIndex - 1).toString() }));
	};

	return (
		<TooltipProvider>
			<Tabs
				className="w-full"
				data-testid="research-plan-tabs"
				onValueChange={setActiveObjective}
				value={activeObjective}
			>
				<div className="flex items-center justify-between mb-4">
					<TabsList>
						{objectiveFields.map((objective, index) => (
							<TabsTrigger key={objective.id} value={index.toString()}>
								Objective {index + 1}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				{objectiveFields.map((objective, objectiveIndex) => (
					<TabsContent className="space-y-6" key={objective.id} value={objectiveIndex.toString()}>
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">{objective.title}</p>
							{objective.description && <p className="text-sm">{objective.description}</p>}
						</div>

						<Tabs
							className="w-full"
							onValueChange={(value) => {
								setActiveTasks((prev) => ({ ...prev, [objectiveIndex]: value }));
							}}
							value={activeTasks[objectiveIndex.toString()] || "0"}
						>
							<div className="flex items-center justify-between mb-4">
								<TabsList>
									{form
										.watch(`research_objectives.${objectiveIndex}.research_tasks`)
										.map((_, taskIndex) => (
											<TabsTrigger key={taskIndex} value={taskIndex.toString()}>
												Task {objectiveIndex + 1}.{taskIndex + 1}
											</TabsTrigger>
										))}
								</TabsList>
								<Button
									data-testid={`add-task-button-${objectiveIndex}`}
									onClick={() => {
										const tasks = form.getValues(
											`research_objectives.${objectiveIndex}.research_tasks`,
										);
										const newTask = { description: "", number: tasks.length + 1, title: "" };
										form.setValue(`research_objectives.${objectiveIndex}.research_tasks`, [
											...tasks,
											newTask,
										]);
										setActiveTasks((prev) => ({
											...prev,
											[objectiveIndex]: tasks.length.toString(),
										}));
									}}
									size="sm"
									type="button"
									variant="outline"
								>
									<PlusCircle className="w-4 h-4 mr-2" />
									Add Task
								</Button>
							</div>

							{form.watch(`research_objectives.${objectiveIndex}.research_tasks`).map((_, taskIndex) => (
								<TabsContent className="space-y-4" key={taskIndex} value={taskIndex.toString()}>
									<div className="flex justify-between items-center">
										<h4 className="text-md font-semibold">Task {taskIndex + 1}</h4>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													data-testid={`remove-task-button-${objectiveIndex}-${taskIndex}`}
													size="sm"
													variant="ghost"
												>
													<Trash2 className="w-4 h-4 mr-2" />
													Remove Task
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Are you sure?</AlertDialogTitle>
													<AlertDialogDescription>
														This action cannot be undone. This will permanently delete this
														task.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => {
															handleRemoveTask(objectiveIndex, taskIndex);
														}}
													>
														Delete
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>

									<FormField
										control={form.control}
										name={`research_objectives.${objectiveIndex}.research_tasks.${taskIndex}.title`}
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													Task Title
													<Tooltip>
														<TooltipTrigger asChild>
															<HelpCircle className="w-4 h-4" />
														</TooltipTrigger>
														<TooltipContent>
															Enter the title of your research task.
														</TooltipContent>
													</Tooltip>
												</FormLabel>
												<FormControl>
													<Input {...field} placeholder="Enter task title" />
												</FormControl>
												{field.value && (
													<CharacterCount
														maxLength={255}
														minLength={10}
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
											<FormItem>
												<FormLabel className="flex items-center gap-2">
													Task Description
													<Tooltip>
														<TooltipTrigger asChild>
															<HelpCircle className="w-4 h-4" />
														</TooltipTrigger>
														<TooltipContent>
															Provide a detailed description of your research task.
														</TooltipContent>
													</Tooltip>
												</FormLabel>
												<FormControl>
													<Textarea
														{...field}
														className="min-h-[100px]"
														placeholder="Enter task description"
														value={field.value ?? ""}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</TabsContent>
							))}
						</Tabs>
					</TabsContent>
				))}
			</Tabs>
		</TooltipProvider>
	);
}
