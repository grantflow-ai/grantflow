"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/app/app-card";
import { AppButton } from "@/components/app/buttons/app-button";
import TextareaField from "@/components/app/fields/textarea-field";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { useDebounce } from "@/utils/debounce";
import { log } from "@/utils/logger/client";
import {
	BASIC_SCIENCE_PLACEHOLDERS,
	BASIC_SCIENCE_QUESTIONS,
	type QuestionConfig,
	TRANSLATIONAL_RESEARCH_PLACEHOLDERS,
	TRANSLATIONAL_RESEARCH_QUESTIONS,
} from "./questions";

type FormInputs = NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;

const getDisabledTextColorClass = (): string => "text-app-gray-400";
const getEnabledTextColorClass = (): string => "text-app-black";

interface QuestionFlowState {
	answeredQuestions: Set<number>;
	lastAnsweredIndex: number;
	selectedQuestion: number;
}

const getQuestionFlowState = (formInputs: FormInputs, questions: QuestionConfig[]): QuestionFlowState => {
	let lastAnsweredIndex = -1;
	const answeredQuestions = new Set<number>();

	for (const [i, question] of questions.entries()) {
		const answer = formInputs[question.key];
		const hasAnswer = answer != null;

		if (hasAnswer) {
			lastAnsweredIndex = i;
			answeredQuestions.add(i);
		}
	}

	let selectedQuestion = lastAnsweredIndex + 1;

	if (answeredQuestions.size === questions.length) {
		selectedQuestion = questions.length - 1;
	}

	return { answeredQuestions, lastAnsweredIndex, selectedQuestion };
};

export function ResearchDeepDiveContent() {
	const formInputs = useApplicationStore((state) => state.application?.form_inputs) ?? {};
	const grantType = useApplicationStore((state) => state.application?.grant_template?.grant_type);

	// Determine which question set and placeholders to use based on grant type
	const isTranslational = grantType === "TRANSLATIONAL";
	const questions = isTranslational ? TRANSLATIONAL_RESEARCH_QUESTIONS : BASIC_SCIENCE_QUESTIONS;
	const placeholders = isTranslational ? TRANSLATIONAL_RESEARCH_PLACEHOLDERS : BASIC_SCIENCE_PLACEHOLDERS;

	log.info("Form inputs", { formInputs, grantType, isTranslational });

	const questionFlowState = useMemo(() => getQuestionFlowState(formInputs, questions), [formInputs, questions]);
	const [selectedQuestion, setSelectedQuestion] = useState<number>(() => questionFlowState.selectedQuestion);
	const [dirtyQuestion, setDirtyQuestion] = useState<null | number>(null);

	return (
		<div className="flex w-full gap-6 px-16 pb-2" data-testid="research-deep-dive-content">
			<QuestionsList
				dirtyQuestion={dirtyQuestion}
				onSelectQuestion={setSelectedQuestion}
				questionFlowState={questionFlowState}
				questions={questions}
				selectedQuestion={selectedQuestion}
			/>

			<AnswerCard
				formInputs={formInputs}
				key={selectedQuestion}
				onBack={() => {
					setSelectedQuestion(selectedQuestion - 1);
					setDirtyQuestion(null);
				}}
				onNext={() => {
					setSelectedQuestion(selectedQuestion + 1);
					setDirtyQuestion(null);
				}}
				placeholders={placeholders}
				questions={questions}
				selectedQuestion={selectedQuestion}
				setDirtyQuestion={setDirtyQuestion}
				showBack={selectedQuestion > 0}
				showNext={selectedQuestion < questions.length - 1}
			/>
		</div>
	);
}

function AnswerCard({
	formInputs,
	onBack,
	onNext,
	placeholders,
	questions,
	selectedQuestion,
	setDirtyQuestion,
	showBack,
	showNext,
}: {
	formInputs: FormInputs;
	onBack: () => void;
	onNext: () => void;
	placeholders: Partial<Record<keyof FormInputs, string>>;
	questions: QuestionConfig[];
	selectedQuestion: number;
	setDirtyQuestion: (index: null | number) => void;
	showBack: boolean;
	showNext: boolean;
}) {
	const { key: questionKey, question } = questions[selectedQuestion];
	const formInputsAnswer = formInputs[questionKey] ?? "";

	const [answerValue, setAnswerValue] = useState(formInputsAnswer);

	useEffect(() => {
		setAnswerValue(formInputsAnswer);
	}, [formInputsAnswer]);

	const handleSave = async () => {
		await useWizardStore.getState().updateFormInputs({ ...formInputs, [questionKey]: answerValue.trim() });
	};

	const handleNext = () => {
		void handleSave();
		onNext();
	};

	const handleBack = () => {
		void handleSave();
		onBack();
	};

	const handleSaveDebounced = useDebounce(handleSave, 3000);

	return (
		<div className="w-1/2 h-full p-1">
			<AppCard className="h-full flex flex-col space-y-5 gap-0 p-5 outline-1 outline-primary rounded mb-1">
				<span className="text-app-black text-base font-semibold leading-tight">{question}</span>
				<TextareaField
					className="h-full w-full focus:outline-app-gray-600 focus-visible:outline-app-gray-600 focus-visible:border-app-gray-600"
					containerClass="h-full"
					onChange={(e) => {
						setAnswerValue(e.target.value);
						setDirtyQuestion(selectedQuestion);
						handleSaveDebounced();
					}}
					placeholder={placeholders[questionKey]}
					testId="research-deep-dive-answer"
					value={answerValue}
				/>

				<div className="flex justify-between w-full gap-3">
					{showBack && (
						<AppButton data-testid="back-button" onClick={handleBack} variant="secondary">
							Back
						</AppButton>
					)}
					{showNext && (
						<div className={showBack ? "" : "ml-auto"}>
							<AppButton data-testid="next-button" onClick={handleNext} variant="primary">
								Next
							</AppButton>
						</div>
					)}
				</div>
			</AppCard>
		</div>
	);
}

function IndexBadge({
	hasAnswer,
	index,
	isDirty,
	isDisabled,
}: {
	hasAnswer: boolean;
	index: number;
	isDirty: boolean;
	isDisabled: boolean;
}) {
	if (hasAnswer && !isDirty) {
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
	isDirty,
	isDisabled,
	isSelected,
	onClick,
	question,
}: {
	hasAnswer: boolean;
	index: number;
	isDirty: boolean;
	isDisabled: boolean;
	isSelected: boolean;
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

	const activeClass = isSelected
		? "outline-2 outline-primary cursor-pointer"
		: "outline-primary group hover:outline-2 hover:outline-primary cursor-pointer";
	const outlineClass = isDisabled ? "outline-app-gray-100" : activeClass;

	return (
		<li>
			<AppCard
				className={`rounded p-3 gap-0 transition-all duration-300 outline-1 ${outlineClass}`}
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
					<IndexBadge hasAnswer={hasAnswer} index={index} isDirty={isDirty} isDisabled={isDisabled} />
					<p className={textClasses} ref={textRef}>
						{question}
					</p>
				</div>
			</AppCard>
		</li>
	);
}

function QuestionsList({
	dirtyQuestion,
	onSelectQuestion,
	questionFlowState,
	questions,
	selectedQuestion,
}: {
	dirtyQuestion: null | number;
	onSelectQuestion: (index: number) => void;
	questionFlowState: QuestionFlowState;
	questions: QuestionConfig[];
	selectedQuestion: number;
}) {
	const { answeredQuestions, lastAnsweredIndex } = questionFlowState;

	return (
		<ul className="w-1/2 p-1 flex flex-col space-y-2 2xl:space-y-3 h-80 overflow-y-scroll 2xl:h-full 2xl:overflow-y-auto">
			{questions.map((item, index) => {
				const hasAnswer = answeredQuestions.has(index);
				const isDisabled = index > 0 && !hasAnswer && index > lastAnsweredIndex + 1;
				const isSelected = index === selectedQuestion;
				const isDirty = index === dirtyQuestion;

				return (
					<QuestionCard
						hasAnswer={hasAnswer}
						index={index}
						isDirty={isDirty}
						isDisabled={isDisabled}
						isSelected={isSelected}
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
