"use client";

import { useFieldArray } from "react-hook-form";
import { MIN_TITLE_LENGTH, NewGrantWizardFormValues } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CharacterCount } from "@/components/character-count";

export function ResearchObjectivesForm({ form }: { form: UseFormReturn<NewGrantWizardFormValues> }) {
	const [activeTab, setActiveTab] = useState("0");

	const { append, fields, remove } = useFieldArray({
		control: form.control,
		name: "research_objectives",
	});

	useEffect(() => {
		console.log("Research Objectives Fields:", fields);
	}, [fields]);

	const handleRemove = (index: number) => {
		if (fields.length > 1) {
			remove(index);
			setActiveTab((prev) => {
				const prevIndex = Number.parseInt(prev);
				if (prevIndex >= index) {
					return Math.max(0, prevIndex - 1).toString();
				}
				return prev;
			});
		} else {
			form.setValue("research_objectives", [
				{ description: "", number: 1, research_tasks: [{ description: "", number: 1, title: "" }], title: "" },
			]);
			setActiveTab("0");
		}
	};

	return (
		<TooltipProvider>
			<Tabs className="w-full" onValueChange={setActiveTab} value={activeTab}>
				<div className="flex items-center justify-between mb-4">
					<TabsList>
						{fields.map((field, index) => (
							<TabsTrigger key={field.id} value={index.toString()}>
								Objective {index + 1}
							</TabsTrigger>
						))}
					</TabsList>
					<Button
						onClick={() => {
							append({
								description: "",
								number: 1,
								research_tasks: [{ description: "", number: 1, title: "" }],
								title: "",
							});
							setActiveTab(fields.length.toString());
						}}
						size="sm"
						type="button"
						variant="outline"
					>
						<PlusCircle className="w-4 h-4 mr-2" />
						Add Objective
					</Button>
				</div>

				{fields.map((field, index) => (
					<TabsContent className="space-y-4" key={field.id} value={index.toString()}>
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-semibold">Research Objective {index + 1}</h3>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button size="sm" variant="ghost">
										<Trash2 className="w-4 h-4 mr-2" />
										Remove Objective
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Are you sure?</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. This will permanently delete this research
											objective.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => {
												handleRemove(index);
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
							name={`research_objectives.${index}.title`}
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										Objective Title
										<Tooltip>
											<TooltipTrigger asChild>
												<HelpCircle className="w-4 h-4" />
											</TooltipTrigger>
											<TooltipContent>Enter the title of your research objective.</TooltipContent>
										</Tooltip>
									</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Enter objective title" />
									</FormControl>
									{field.value && (
										<CharacterCount
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
								<FormItem>
									<FormLabel className="flex items-center gap-2">
										Objective Description (Optional)
										<Tooltip>
											<TooltipTrigger asChild>
												<HelpCircle className="w-4 h-4" />
											</TooltipTrigger>
											<TooltipContent>
												Provide a detailed description of your research objective.
											</TooltipContent>
										</Tooltip>
									</FormLabel>
									<FormControl>
										<Textarea
											className="min-h-[100px]"
											placeholder="Enter objective description (optional)"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</TabsContent>
				))}
			</Tabs>
		</TooltipProvider>
	);
}
