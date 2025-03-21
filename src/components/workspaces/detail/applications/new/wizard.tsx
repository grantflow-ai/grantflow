import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { KnowledgeBaseForm } from "./knowledge-base-form";
import { ResearchObjectivesForm } from "./research-objectives-form";
import { ResearchPlanForm } from "./research-plan-form";
import { Stepper } from "@/components/stepper";
import { Toaster } from "sonner";
import { newGrantWizardForm, NewGrantWizardFormValues } from "@/lib/schema";
import { toast } from "sonner";

const stepTitles = ["Research Objectives", "Knowledge Base", "Research Plan"];

export function Wizard({ onSubmit }: { onSubmit: (data: NewGrantWizardFormValues) => Promise<void> }) {
	const [currentStep, setCurrentStep] = useState(0);

	const form = useForm<NewGrantWizardFormValues>({
		defaultValues: {
			files: [],
			research_objectives: [
				{
					description: "",
					research_tasks: [
						{
							description: "",
							title: "",
						},
					],
					title: "",
				},
			],
		},
		resolver: zodResolver(newGrantWizardForm),
	});

	useEffect(() => {
		console.log("Initial form values:", form.getValues());
	}, [form]);

	const goToNextStep = useCallback(() => {
		setCurrentStep((prev) => Math.min(prev + 1, stepTitles.length - 1));
	}, []);

	const goToPreviousStep = useCallback(() => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	}, []);

	const handleStepClick = useCallback((step: number) => {
		setCurrentStep(step);
	}, []);

	const handleSubmit = async (data: NewGrantWizardFormValues) => {
		try {
			await onSubmit(data);
			toast.success("Grant application submitted successfully!");
		} catch {
			toast.error("Failed to submit grant application. Please try again.");
		}
	};

	return (
		<div className="container mx-auto max-w-4xl py-8" data-testid="wizard-container">
			<Toaster />
			<Form {...form} data-testid="wizard-form">
				<Card>
					<CardHeader>
						<Stepper currentStep={currentStep} onStepClick={handleStepClick} steps={stepTitles} />
					</CardHeader>
					<CardContent>
						{currentStep === 0 && <ResearchObjectivesForm form={form} />}
						{currentStep === 1 && <KnowledgeBaseForm form={form} />}
						{currentStep === 2 && <ResearchPlanForm form={form} />}
					</CardContent>
					<CardFooter className="flex justify-between">
						{currentStep > 0 ? (
							<Button
								aria-label="Go to previous step"
								data-testid="previous-button"
								onClick={goToPreviousStep}
								type="button"
								variant="outline"
							>
								Previous
							</Button>
						) : (
							<div /> /* Spacer when there's no 'Previous' button */
						)}
						<Button
							aria-label={
								currentStep === stepTitles.length - 1 ? "Submit application" : "Go to next step"
							}
							data-testid="next-button"
							onClick={
								currentStep === stepTitles.length - 1 ? form.handleSubmit(handleSubmit) : goToNextStep
							}
							type="button"
						>
							{currentStep === stepTitles.length - 1 ? "Submit" : "Next"}
						</Button>
					</CardFooter>
				</Card>
			</Form>
		</div>
	);
}
