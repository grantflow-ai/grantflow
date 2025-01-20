import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResearchTaskForm } from "./research-tasks-form";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { NewGrantWizardFormValues } from "@/lib/schema";

export function ResearchTaskTabs({
	form,
	loading,
	objectiveIndex,
}: {
	form: UseFormReturn<NewGrantWizardFormValues>;
	loading: boolean;
	objectiveIndex: number;
}) {
	const { append, fields, remove } = useFieldArray({
		control: form.control,
		name: `researchPlan.objectives.${objectiveIndex}.tasks`,
	});

	const [activeTab, setActiveTab] = useState("0");

	return (
		<Tabs className="w-full" data-testid="research-task-tabs" onValueChange={setActiveTab} value={activeTab}>
			<div className="flex items-center mb-4">
				<TabsList>
					{fields.map((field, index) => (
						<TabsTrigger key={field.id} value={index.toString()}>
							{field.title ? field.title.slice(0, 20) : `Task ${objectiveIndex + 1}.${index + 1}`}
							{field.title && field.title.length > 20 ? "..." : ""}
						</TabsTrigger>
					))}
				</TabsList>
				<Button
					aria-label="Add Task"
					data-testid="add-task-button"
					onClick={() => {
						const newTask = { description: "", task_number: fields.length + 1, title: "" };
						append(newTask);
						setActiveTab(fields.length.toString());
					}}
					size="icon"
					type="button"
					variant="ghost"
				>
					<PlusCircle className="h-5 w-5" />
					<span className="sr-only">Add Task</span>
				</Button>
			</div>
			{fields.map((field, index) => (
				<TabsContent key={field.id} value={index.toString()}>
					<ResearchTaskForm
						form={form}
						loading={loading}
						objectiveIndex={objectiveIndex}
						onClickRemove={() => {
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
								// Replace the last task with an empty one
								form.setValue(`researchPlan.objectives.${objectiveIndex}.tasks`, [
									{ description: "", title: "" },
								]);
								setActiveTab("0");
							}
						}}
						taskIndex={index}
					/>
				</TabsContent>
			))}
		</Tabs>
	);
}
