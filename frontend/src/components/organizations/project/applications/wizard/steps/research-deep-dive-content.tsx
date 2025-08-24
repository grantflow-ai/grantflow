"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { TextareaField } from "@/components/app/fields";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

type FormInputs = NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;

const getDisabledTextColorClass = (): string => "text-app-gray-400";
const getEnabledTextColorClass = (): string => "text-app-black";

const placeholders: Record<keyof FormInputs, string> = {
	background_context: "Provide context and background of your research project...",
	hypothesis: "Describe your central hypothesis or key research question...",
	impact: "Describe how your research will contribute to the field and society...",
	novelty_and_innovation: "Highlight what makes your approach unique or innovative...",
	preliminary_data: "Share any preliminary findings that support your research...",
	rationale: "Explain why this research is important and what motivates it...",
	research_feasibility: "Describe what makes your research plan realistic and achievable...",
	scientific_infrastructure: "Describe the scientific infrastructure and resources available for your research...",
	team_excellence: "Explain what makes your team uniquely qualified for this project...",
};

const RESEARCH_QUESTIONS: { key: keyof FormInputs; question: string }[] = [
	{ key: "background_context", question: "What is the context and background of your research?" },
	{
		key: "hypothesis",
		question: "What is the central hypothesis or key question your research aims to address?",
	},
	{ key: "rationale", question: "Why is this research important and what motivates its pursuit?" },
	{
		key: "novelty_and_innovation",
		question: "What makes your approach unique or innovative compared to existing research?",
	},
	{ key: "impact", question: "How will your research contribute to the field and society?" },
	{
		key: "team_excellence",
		question: "What makes your team uniquely qualified to carry out this project?",
	},
	{
		key: "research_feasibility",
		question: "What makes your research plan realistic and achievable?",
	},
	{
		key: "preliminary_data",
		question: "Have you obtained any preliminary findings that support your research?",
	},
];

interface QuestionFlowState {
	answeredQuestions: Set<number>;
	lastAnsweredIndex: number;
	selectedQuestion: number;
}

const getQuestionFlowState = (formInputs: FormInputs): QuestionFlowState => {
	let lastAnsweredIndex = -1;
	const answeredQuestions = new Set<number>();

	for (const [i, question] of RESEARCH_QUESTIONS.entries()) {
		const answer = formInputs[question.key];
		const hasAnswer = answer && answer.trim().length > 0;

		if (hasAnswer) {
			lastAnsweredIndex = i;
			answeredQuestions.add(i);
		}
	}

	let selectedQuestion = lastAnsweredIndex + 1;

	if (answeredQuestions.size === RESEARCH_QUESTIONS.length) {
		selectedQuestion = RESEARCH_QUESTIONS.length - 1;
	}

	return { answeredQuestions, lastAnsweredIndex, selectedQuestion };
};

export function ResearchDeepDiveContent() {
	const formInputs = (useApplicationStore((state) => state.application?.form_inputs) ?? {}) as FormInputs;

	log.info("Form inputs", { formInputs });

	const questionFlowState = useMemo(() => getQuestionFlowState(formInputs), [formInputs]);
	const [selectedQuestion, setSelectedQuestion] = useState<number>(() => questionFlowState.selectedQuestion);

	useEffect(() => {
		setSelectedQuestion(questionFlowState.selectedQuestion);
	}, [questionFlowState.selectedQuestion]);

	return (
		<div className="flex w-full gap-6 px-16" data-testid="research-deep-dive-content">
			<QuestionsList onSelectQuestion={setSelectedQuestion} questionFlowState={questionFlowState} />

			<AnswerCard
				formInputs={formInputs}
				key={selectedQuestion}
				onBack={() => {
					setSelectedQuestion(selectedQuestion - 1);
				}}
				selectedQuestion={selectedQuestion}
			/>
		</div>
	);
}

function AnswerCard({
	formInputs,
	onBack,
	selectedQuestion,
}: {
	formInputs: FormInputs;
	onBack: () => void;
	selectedQuestion: number;
}) {
	const { key: questionKey, question } = RESEARCH_QUESTIONS[selectedQuestion];
	const formInputsAnswer = formInputs[questionKey] || "";

	const [answerValue, setAnswerValue] = useState(formInputsAnswer);

	useEffect(() => {
		setAnswerValue(formInputsAnswer);
	}, [formInputsAnswer]);

	const isBackVisible = selectedQuestion >= 1;
	const isSaveEnabled = answerValue.trim().length > 0;

	const handleSave = async () => {
		if (isSaveEnabled) {
			await useWizardStore.getState().updateFormInputs({ ...formInputs, [questionKey]: answerValue.trim() });
		}
	};

	return (
		<div className="w-1/2">
			<AppCard className="flex flex-col space-y-5 gap-0 p-5 outline-1 outline-primary rounded mb-1">
				<span className="text-app-black text-base font-semibold leading-tight">{question}</span>
				<TextareaField
					className="min-h-96 w-full focus:outline-app-gray-600 focus-visible:outline-app-gray-600 focus-visible:border-app-gray-600"
					onChange={(e) => {
						setAnswerValue(e.target.value);
					}}
					placeholder={placeholders[questionKey]}
					testId="research-deep-dive-answer"
					value={answerValue}
				/>

				<div className="flex justify-between w-full gap-3">
					{isBackVisible && (
						<AppButton data-testid="back-button" onClick={onBack} variant="secondary">
							Back
						</AppButton>
					)}
					<div className={isBackVisible ? "" : "ml-auto"}>
						<AppButton
							data-testid="save-button"
							disabled={!isSaveEnabled}
							onClick={handleSave}
							variant="primary"
						>
							Save
						</AppButton>
					</div>
				</div>
			</AppCard>
		</div>
	);
}

function IndexBadge({ hasAnswer, index, isDisabled }: { hasAnswer: boolean; index: number; isDisabled: boolean }) {
	if (hasAnswer) {
		return <Image alt="Done" className="size-7" height={26} src="/icons/research-question-done.svg" width={26} />;
	}

	const badgeClasses = isDisabled
		? "bg-app-gray-100 text-white"
		: "bg-transparent outline outline-1 outline-primary text-primary group-hover:bg-primary group-hover:text-white";

	return (
		<div
			className={`size-7 rounded-full flex items-center justify-center text-base font-semibold font-heading ${badgeClasses}`}
		>
			{index + 1}
		</div>
	);
}

function QuestionCard({
	hasAnswer,
	index,
	isDisabled,
	onClick,
	question,
}: {
	hasAnswer: boolean;
	index: number;
	isDisabled: boolean;
	onClick: () => void;
	question: string;
}) {
	const textRef = useRef<HTMLParagraphElement>(null);
	const [isEllipsized, setIsEllipsized] = useState(false);

	useEffect(() => {
		const checkEllipsis = () => {
			if (textRef.current) {
				const isOverflowing = textRef.current.scrollWidth > textRef.current.clientWidth;
				setIsEllipsized(isOverflowing);
			}
		};

		checkEllipsis();
		window.addEventListener("resize", checkEllipsis);
		return () => {
			window.removeEventListener("resize", checkEllipsis);
		};
	}, []);

	const textColorClass = isDisabled ? getDisabledTextColorClass() : getEnabledTextColorClass();
	const textClasses = isEllipsized
		? `flex-1 max-h-5 group-hover:max-h-20 transition-all duration-300 truncate group-hover:whitespace-normal ${textColorClass}`
		: `flex-1 truncate ${textColorClass}`;

	return (
		<li>
			<AppCard
				className={`rounded p-3 gap-0 transition-all duration-300 outline-1 ${isDisabled ? "outline-app-gray-100" : "outline-primary group hover:outline-2 hover:outline-primary cursor-pointer"}`}
				data-testid={`question-card-${index}`}
				onClick={onClick}
				onKeyDown={(e: React.KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClick();
					}
				}}
				tabIndex={0}
			>
				<div className="flex items-center gap-3">
					<IndexBadge hasAnswer={hasAnswer} index={index} isDisabled={isDisabled} />
					<p className={textClasses} ref={textRef}>
						{question}
					</p>
				</div>
			</AppCard>
		</li>
	);
}

function QuestionsList({
	onSelectQuestion,
	questionFlowState,
}: {
	onSelectQuestion: (index: number) => void;
	questionFlowState: QuestionFlowState;
}) {
	const { answeredQuestions, lastAnsweredIndex } = questionFlowState;

	return (
		<ul className="w-1/2 flex flex-col space-y-3 pb-2">
			{RESEARCH_QUESTIONS.map((item, index) => {
				const hasAnswer = answeredQuestions.has(index);
				const isDisabled = index > 0 && !hasAnswer && index > lastAnsweredIndex + 1;

				return (
					<QuestionCard
						hasAnswer={hasAnswer}
						index={index}
						isDisabled={isDisabled}
						key={item.key}
						onClick={() => {
							if (!isDisabled) {
								onSelectQuestion(index);
							}
						}}
						question={item.question}
					/>
				);
			})}
		</ul>
	);
}
