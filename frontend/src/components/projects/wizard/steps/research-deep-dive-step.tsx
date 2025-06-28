"use client";

import { useState } from "react";
import { AppCard, TextareaField } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";

type FormInputsKey = keyof NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;

const RESEARCH_QUESTIONS: { key: FormInputsKey; question: string }[] = [
	{ key: "background_context", question: "What is the context and background of your research?" },
	{ key: "hypothesis", question: "What is the central hypothesis or key question your research aims to address?" },
	{ key: "rationale", question: "Why is this research important and what motivates its pursuit?" },
	{
		key: "novelty_and_innovation",
		question: "What makes your approach unique or innovative compared to existing research?",
	},
	{ key: "impact", question: "How will your research contribute to the field and society?" },
	{ key: "team_excellence", question: "What makes your team uniquely qualified to carry out this project?" },
	{ key: "research_feasibility", question: "What makes your research plan realistic and achievable?" },
	{ key: "preliminary_data", question: "Have you obtained any preliminary findings that support your research?" },
];

export function ResearchDeepDiveStep() {
	const [selectedQuestion, setSelectedQuestion] = useState<null | number>(0);
	const application = useApplicationStore((state) => state.application);
	const updateApplication = useApplicationStore((state) => state.updateApplication);

	const formInputs = application?.form_inputs ?? ({} as Record<FormInputsKey, string>);

	const handleQuestionSelect = (index: number) => {
		setSelectedQuestion(index);
	};

	const handleAnswerChange = (answer: string) => {
		if (selectedQuestion !== null) {
			const questionKey = RESEARCH_QUESTIONS[selectedQuestion].key;
			void updateApplication({
				form_inputs: {
					...formInputs,
					[questionKey]: answer,
				},
			});
		}
	};

	const currentAnswer = selectedQuestion === null ? "" : formInputs[RESEARCH_QUESTIONS[selectedQuestion].key] || "";
	const wordCount = currentAnswer
		.trim()
		.split(/\s+/)
		.filter((word: string) => word.length > 0).length;

	return (
		<div className="flex size-full" data-testid="research-deep-dive-step">
			{/* Header with title, description and AI button */}
			<div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 p-6">
				<div className="flex items-start justify-between">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="research-deep-dive-header"
						>
							Research Deep Dive
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="research-deep-dive-description"
						>
							Before generating your grant application draft, it would be helpful to learn a bit more
							about your research to ensure more accurate results.
						</p>
					</div>
					<AppButton
						className="bg-app-surface-secondary text-app-action-primary border-app-border-primary shrink-0"
						data-testid="ai-try-button"
						leftIcon={<span>✨</span>}
						variant="secondary"
					>
						Let the AI Try!
					</AppButton>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex size-full pt-32">
				{/* Left pane - Questions list */}
				<div className="w-1/2 overflow-y-auto p-6">
					<div className="space-y-3">
						{RESEARCH_QUESTIONS.map((item, index) => (
							<QuestionCard
								index={index + 1}
								isAnswered={Boolean(formInputs[item.key] && formInputs[item.key].trim())}
								isSelected={selectedQuestion === index}
								key={index}
								onClick={() => {
									handleQuestionSelect(index);
								}}
								question={item.question}
							/>
						))}
					</div>
				</div>

				{/* Right pane - Answer area */}
				<div className="w-1/2 border-l border-gray-100 p-6">
					{selectedQuestion === null ? (
						<div className="flex h-full items-center justify-center">
							<p className="text-muted-foreground-dark text-center">
								Select a question to start answering
							</p>
						</div>
					) : (
						<AnswerArea
							answer={currentAnswer}
							onAnswerChange={handleAnswerChange}
							question={RESEARCH_QUESTIONS[selectedQuestion].question}
							wordCount={wordCount}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function AnswerArea({
	answer,
	onAnswerChange,
	question,
	wordCount: _wordCount,
}: {
	answer: string;
	onAnswerChange: (answer: string) => void;
	question: string;
	wordCount: number;
}) {
	return (
		<div className="h-full flex flex-col">
			<TextareaField
				className="flex-1 min-h-0 resize-none border-app-border-primary focus:border-app-action-primary"
				countType="words"
				label={question}
				maxCount={1000}
				onChange={(e) => {
					onAnswerChange(e.target.value);
				}}
				placeholder="Context and background of your research"
				showCount={true}
				testId="research-deep-dive-answer"
				value={answer}
			/>

			<div className="mt-4 flex gap-3">
				<AppButton className="flex-1" variant="secondary">
					Back
				</AppButton>
				<AppButton className="flex-1" variant="primary">
					Save
				</AppButton>
			</div>
		</div>
	);
}

function QuestionCard({
	index,
	isAnswered,
	isSelected,
	onClick,
	question,
}: {
	index: number;
	isAnswered: boolean;
	isSelected: boolean;
	onClick: () => void;
	question: string;
}) {
	return (
		<AppCard
			className={`p-4 cursor-pointer transition-colors border-2 ${
				isSelected
					? "border-app-action-primary bg-app-surface-secondary"
					: "border-app-border-primary bg-app-surface-primary hover:border-app-action-secondary"
			}`}
			onClick={onClick}
		>
			<div className="flex items-start gap-3">
				<div
					className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
						isAnswered || isSelected ? "bg-app-action-primary text-white" : "bg-gray-200 text-gray-600"
					}`}
				>
					{isAnswered ? "✓" : index}
				</div>
				<p
					className={`text-sm leading-tight ${
						isSelected ? "text-app-text-primary font-medium" : "text-app-text-secondary"
					}`}
				>
					{question}
				</p>
			</div>
		</AppCard>
	);
}