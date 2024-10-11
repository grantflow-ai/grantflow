"use client";

import { useEffect, useState } from "react";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "gen/ui/card";
import { Separator } from "gen/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "gen/ui/sheet";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Progress } from "gen/ui/progress";
import { titleize, underscore } from "inflection";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import type { ValueType } from "@/components/wizard/dynamic-forms/form-components";
import { QuestionsAccordion } from "@/components/wizard/dynamic-forms/questions-accordion";
import type { GrantApplicationQuestion, GrantWizardSection } from "@/types/database-types";

export function WizardStep({
	title,
	sections,
}: {
	title: string;
	sections: (GrantWizardSection & { questions: GrantApplicationQuestion[] })[];
	onPressNext: () => void;
}) {
	const [currentStep, setCurrentStep] = useState(0);
	const [answers, setAnswers] = useState<Record<number, ValueType>>({});
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const totalQuestions = sections.reduce((acc, section) => acc + section.questions.length, 0);
		const answeredQuestions = Object.keys(answers).length;
		setProgress((answeredQuestions / totalQuestions) * 100);
	}, [answers, sections]);

	const currentSection = sections[currentStep];

	const handleAnswerChange = (questionId: string, value: ValueType) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const StepsList = () => (
		<nav className="space-y-1" data-testid="steps-list">
			{sections.map((section, index) => (
				<Tooltip key={section.id}>
					<TooltipTrigger asChild={true}>
						<Button
							key={section.title}
							data-testid={`step-${index}`}
							className={`w-full flex justify-start px-3 py-2 text-sm font-medium rounded-md ${
								index === currentStep
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-muted"
							}`}
							variant="outline"
							onClick={() => {
								setCurrentStep(index);
							}}
						>
							<span className="mr-3 text-sm">{index + 1}</span>
							{titleize(underscore(section.title))}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<span className="bg-secondary">{section.help_text}</span>
					</TooltipContent>
				</Tooltip>
			))}
		</nav>
	);

	return (
		<div className="w-full h-full mx-auto p-4 sm:p-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-lg sm:text-2xl" data-testid="form-title">
						{title}
					</CardTitle>
					<Sheet>
						<SheetTrigger asChild={true}>
							<Button variant="ghost" size="icon" className="md:hidden" data-testid="mobile-menu-button">
								<Menu className="h-4 w-4" />
								<span className="sr-only">Toggle steps menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="left">
							<div className="mt-6 w-full">
								<StepsList />
							</div>
						</SheetContent>
					</Sheet>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row gap-6">
						<div className="hidden md:block md:w-1/4">
							<TooltipProvider>
								<StepsList />
							</TooltipProvider>
						</div>
						<QuestionsAccordion
							questions={currentSection.questions}
							answers={answers}
							handleAnswerChange={handleAnswerChange}
							setFileIds={() => {}}
						/>
					</div>
				</CardContent>
				<Separator className="my-4" />
				<CardFooter className="flex flex-col gap-4">
					<Progress value={progress} className="w-full" data-testid="progress-bar" />
					<div className="flex justify-between w-full">
						<Button
							variant="outline"
							onClick={() => {
								setCurrentStep(Math.max(0, currentStep - 1));
							}}
							disabled={currentStep === 0}
							data-testid="back-button"
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Back
						</Button>
						<Button
							onClick={() => {
								setCurrentStep(Math.min(sections.length - 1, currentStep + 1));
							}}
							disabled={currentStep === sections.length - 1}
							data-testid="next-button"
						>
							Next <ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}
