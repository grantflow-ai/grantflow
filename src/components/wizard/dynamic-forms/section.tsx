"use client";

import { Button } from "gen/ui/button";
import { useEffect, useState } from "react";
import { titleize, underscore } from "inflection";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "gen/ui/collapsible";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Progress } from "gen/ui/progress";
import { type Question, Section } from "@/components/wizard/dynamic-forms/types";
import { getInputComponent } from "@/components/wizard/dynamic-forms/inputs";

export interface QuestionProps extends Question {
	onValueChange: (value: unknown) => void;
	dependencyMet: boolean;
}

const Question = ({
	answerType,
	dependencyMet,
	onValueChange,
	required,
	maxLength,
	questionId,
	questionText,
}: QuestionProps) => {
	if (!dependencyMet) {
		return null;
	}

	const InputComponent = getInputComponent(answerType);
	return (
		<div className="mb-4">
			<h4 className="font-semibold mb-2">{questionText}</h4>
			<InputComponent onValueChange={onValueChange} required={required} maxLength={maxLength} questionId={questionId} />
		</div>
	);
};

function GrantSection({
	description,
	name,
	sectionId,
	onActivate,
}: {
	description: string;
	name: string;
	sectionId: number;
	onActivate: () => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (isOpen) {
			onActivate();
		}
	}, [isOpen]);

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={() => {
				setIsOpen((prev) => !prev);
			}}
			className="mb-2"
			data-testid={`grant-section-${sectionId}`}
		>
			<CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left bg-background hover:bg-accent rounded-md">
				<h2 className="text-xl font-semibold">{titleize(underscore(name).replace("_", " "))}</h2>
				<ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? "transform rotate-180" : ""}`} />
			</CollapsibleTrigger>
			<CollapsibleContent className="mt-2 mb-4">
				<p className="text-muted-foreground mb-4">{description}</p>
			</CollapsibleContent>
		</Collapsible>
	);
}
export function GrantApplication({ sections }: { sections: Section[] }) {
	const [activeSection, setActiveSection] = useState<number>(sections[0].sectionId);
	const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
	const [completionPercentage, setCompletionPercentage] = useState(0);

	const totalRequiredQuestions = sections.reduce(
		(total, section) => total + section.questions.filter((q) => q.required).length,
		0,
	);

	useEffect(() => {
		const answeredRequired = [...answeredQuestions].filter((qId) =>
			sections.some((section) => section.questions.some((q) => q.questionId === qId && q.required)),
		).length;
		const newPercentage = (answeredRequired / totalRequiredQuestions) * 100;
		setCompletionPercentage(newPercentage);
	}, [answeredQuestions, sections, totalRequiredQuestions]);

	const handleQuestionAnswer = (questionId: number, value: unknown) => {
		setAnsweredQuestions((prev) => {
			const newSet = new Set(prev);
			if (value !== undefined && value !== "") {
				newSet.add(questionId);
			} else {
				newSet.delete(questionId);
			}
			return newSet;
		});
	};

	return (
		<div className="flex flex-col w-full h-screen overflow-hidden">
			<div className="p-4 bg-background border-b">
				<Progress value={completionPercentage} className="w-full" />
				<p className="text-sm text-muted-foreground mt-2">{completionPercentage.toFixed(0)}% complete</p>
			</div>
			<div className="flex flex-1 overflow-hidden">
				<div className="w-1/3 overflow-y-auto p-4 border-r">
					{sections.map(({ sectionId, name, description }) => (
						<GrantSection
							key={sectionId}
							sectionId={sectionId}
							name={name}
							description={description}
							onActivate={() => {
								setActiveSection(sectionId);
							}}
						/>
					))}
				</div>
				<div className="w-2/3 overflow-y-auto p-4">
					<Accordion type="single" collapsible className="w-full">
						{sections
							.find((section) => section.sectionId === activeSection)
							?.questions.map((question) => (
								<AccordionItem key={question.questionId} value={`question-${question.questionId}`}>
									<AccordionTrigger>{question.questionText}</AccordionTrigger>
									<AccordionContent>
										<Question
											{...question}
											onValueChange={(value) => {
												handleQuestionAnswer(question.questionId, value);
											}}
											dependencyMet={true} // This should be calculated based on the actual dependencies
										/>
									</AccordionContent>
								</AccordionItem>
							))}
					</Accordion>
				</div>
				<div className="fixed bottom-4 right-4">
					<Button type="submit" disabled={completionPercentage < 100}>
						Submit Application
					</Button>
				</div>
			</div>
		</div>
	);
}
