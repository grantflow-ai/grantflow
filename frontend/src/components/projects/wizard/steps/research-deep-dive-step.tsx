"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppCard, TextareaField } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
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
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_deep_dive);

	const formInputs = useMemo(
		() => application?.form_inputs ?? ({} as Partial<Record<FormInputsKey, string>>),
		[application?.form_inputs],
	);

	const [localAnswers, setLocalAnswers] = useState<Partial<Record<FormInputsKey, string>>>(() => {
		const initialAnswers: Partial<Record<FormInputsKey, string>> = {};
		RESEARCH_QUESTIONS.forEach((question) => {
			if (formInputs[question.key]) {
				initialAnswers[question.key] = formInputs[question.key];
			}
		});
		return initialAnswers;
	});

	const [savedQuestions, setSavedQuestions] = useState<Set<FormInputsKey>>(new Set());

	useEffect(() => {
		setLocalAnswers((prev) => {
			const updatedAnswers: Partial<Record<FormInputsKey, string>> = { ...prev };

			RESEARCH_QUESTIONS.forEach((question) => {
				if (formInputs[question.key] && !prev[question.key]) {
					updatedAnswers[question.key] = formInputs[question.key];
				}
			});

			return updatedAnswers;
		});
	}, [formInputs]);

	const handleQuestionSelect = (index: number) => {
		setSelectedQuestion(index);
	};

	const handleAnswerChange = (answer: string) => {
		if (selectedQuestion !== null) {
			const questionKey = RESEARCH_QUESTIONS[selectedQuestion].key;
			setLocalAnswers((prev) => ({
				...prev,
				[questionKey]: answer,
			}));
		}
	};

	const handleSave = async () => {
		if (selectedQuestion !== null) {
			const questionKey = RESEARCH_QUESTIONS[selectedQuestion].key;
			const answer = localAnswers[questionKey] ?? "";

			await updateApplication({
				form_inputs: {
					...formInputs,
					[questionKey]: answer,
				},
			});

			setSavedQuestions((prev) => new Set([questionKey, ...prev]));

			if (selectedQuestion < RESEARCH_QUESTIONS.length - 1) {
				setSelectedQuestion(selectedQuestion + 1);
			}
		}
	};

	const handleBack = () => {
		if (selectedQuestion !== null && selectedQuestion > 0) {
			setSelectedQuestion(selectedQuestion - 1);
		}
	};

	const getCurrentAnswer = () => {
		if (selectedQuestion === null) return "";
		const questionKey = RESEARCH_QUESTIONS[selectedQuestion].key;
		return localAnswers[questionKey] ?? "";
	};

	const isQuestionAnswered = (key: FormInputsKey): boolean => {
		const value = formInputs[key];
		return savedQuestions.has(key) || Boolean(value && value.trim().length > 0);
	};

	const hasUnsavedChanges = (): boolean => {
		if (selectedQuestion === null) return false;
		const questionKey = RESEARCH_QUESTIONS[selectedQuestion].key;
		const currentValue = localAnswers[questionKey] ?? "";
		const savedValue = formInputs[questionKey] ?? "";
		return currentValue.trim() !== savedValue.trim();
	};

	const currentAnswer = getCurrentAnswer();
	const wordCount = currentAnswer
		.trim()
		.split(/\s+/)
		.filter((word: string) => word.length > 0).length;

	return (
		<div className="flex size-full" data-testid="research-deep-dive-step">
			{}
			<div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 p-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2
							className="font-heading text-lg sm:text-xl md:text-2xl lg:text-2xl font-medium leading-loose whitespace-nowrap"
							data-testid="research-deep-dive-header"
						>
							Research Deep Dive
						</h2>
						<AppButton
							className="bg-app-surface-secondary text-app-primary border-app-border-primary shrink-0"
							data-testid="ai-try-button"
							disabled={isAutofillLoading || !application}
							leftIcon={<Image alt="AI Try" height={16} src="/icons/button-logo.svg" width={16} />}
							onClick={() => triggerAutofill("research_deep_dive")}
							variant="secondary"
						>
							{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
						</AppButton>
					</div>
					<p
						className="text-muted-foreground-dark leading-tight"
						data-testid="research-deep-dive-description"
					>
						Before generating your grant application draft, it would be helpful to learn a bit more about
						your research to ensure more accurate results.
					</p>
				</div>
			</div>

			{}
			<div className="flex size-full pt-32">
				{}
				<div className="w-1/2 overflow-y-auto p-6">
					<div className="space-y-3">
						{RESEARCH_QUESTIONS.map((item, index) => (
							<QuestionCard
								index={index + 1}
								isAnswered={isQuestionAnswered(item.key)}
								isSelected={selectedQuestion === index}
								key={item.key}
								onClick={() => {
									handleQuestionSelect(index);
								}}
								question={item.question}
							/>
						))}
					</div>
				</div>

				{}
				<div className="w-1/2 border-l border-gray-100 p-6">
					{selectedQuestion === null ? (
						<div className="flex h-full items-center justify-center" data-testid="empty-state-container">
							<p className="text-muted-foreground-dark text-center" data-testid="empty-state-message">
								Select a question to start answering
							</p>
						</div>
					) : (
						<AnswerArea
							answer={currentAnswer}
							hasChanges={hasUnsavedChanges()}
							isFirstQuestion={selectedQuestion === 0}
							onAnswerChange={handleAnswerChange}
							onBack={handleBack}
							onSave={handleSave}
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
	hasChanges,
	isFirstQuestion,
	onAnswerChange,
	onBack,
	onSave,
	question,
	wordCount: _wordCount,
}: {
	answer: string;
	hasChanges: boolean;
	isFirstQuestion: boolean;
	onAnswerChange: (answer: string) => void;
	onBack: () => void;
	onSave: () => void;
	question: string;
	wordCount: number;
}) {
	return (
		<div className="h-full flex flex-col">
			<TextareaField
				className="flex-1 min-h-0 resize-none border-app-border-primary focus:border-app-primary"
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
				{!isFirstQuestion && (
					<AppButton className="flex-1" onClick={onBack} variant="secondary">
						Back
					</AppButton>
				)}
				<AppButton
					className={isFirstQuestion ? "w-full" : "flex-1"}
					disabled={!answer || answer.trim().length === 0 || !hasChanges}
					onClick={onSave}
					variant="primary"
				>
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
					? "border-app-primary bg-app-surface-secondary"
					: "border-app-border-primary bg-app-surface-primary hover:border-app-action-secondary"
			}`}
			onClick={onClick}
		>
			<div className="flex items-start gap-3">
				<div
					className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
						isAnswered || isSelected ? "bg-app-primary text-white" : "bg-gray-200 text-gray-600"
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
