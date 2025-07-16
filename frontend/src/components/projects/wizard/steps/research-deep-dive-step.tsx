"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppCard, TextareaField } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";

type FormInputsKey = keyof NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;

type QuestionState = "default" | "disabled" | "done";

const RESEARCH_QUESTIONS: { key: FormInputsKey; question: string }[] = [
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

const isQuestionAccessible = (questionIndex: number, formInputs: Record<string, unknown>): boolean => {
	for (let i = 0; i < questionIndex; i++) {
		const prevQuestionKey = RESEARCH_QUESTIONS[i].key;
		const prevAnswerValue = formInputs[prevQuestionKey] as string | undefined;
		const prevHasAnswer = prevAnswerValue && prevAnswerValue.trim().length > 0;

		if (!prevHasAnswer) {
			return false;
		}
	}
	return true;
};

const getQuestionState = (
	questionIndex: number,
	questionKey: FormInputsKey,
	selectedQuestion: number,
	formInputs: Record<string, unknown>,
): QuestionState => {
	const answerValue = formInputs[questionKey] as string | undefined;
	const hasAnswer = answerValue && answerValue.trim().length > 0;

	if (hasAnswer) {
		return "done";
	}

	if (selectedQuestion === questionIndex) {
		return "default";
	}

	if (!isQuestionAccessible(questionIndex, formInputs)) {
		return "disabled";
	}

	return "disabled";
};

export function ResearchDeepDiveStep() {
	const triggerAutofill = useWizardStore((state) => state.triggerAutofill);
	const isAutofillLoading = useWizardStore((state) => state.isAutofillLoading.research_deep_dive);

	const [selectedQuestion, setSelectedQuestion] = useState<number>(0);

	return (
		<div
			className="flex flex-col h-full lg:px-6 lg:pt-6 md:px-4 md:pt-4 px-3 pt-3 bg-preview-bg space-y-6 overflow-y-auto"
			data-testid="research-deep-dive-step"
		>
			<ResearchDeepDiveHeader
				isAutofillLoading={isAutofillLoading}
				onTriggerAutofill={() => triggerAutofill("research_deep_dive")}
			/>

			<div className="flex w-full gap-6 px-16">
				<QuestionsList onSelectQuestion={setSelectedQuestion} selectedQuestion={selectedQuestion} />

				<AnswerCard
					onBack={() => {
						setSelectedQuestion(selectedQuestion - 1);
					}}
					selectedQuestion={selectedQuestion}
				/>
			</div>
		</div>
	);
}

function AnswerCard({ onBack, selectedQuestion }: { onBack: () => void; selectedQuestion: number }) {
	const updateFormInputs = useWizardStore((state) => state.updateFormInputs);
	const formInputs = useApplicationStore((state) => state.application?.form_inputs ?? {}) as Record<string, unknown>;

	const currentQuestion = RESEARCH_QUESTIONS[selectedQuestion];
	const { question } = currentQuestion;
	const questionKey = currentQuestion.key;
	const answer = (formInputs[questionKey] as string) || "";

	const [answerValue, setAnswerValue] = useState<string>(answer);

	useEffect(() => {
		setAnswerValue(answer);
	}, [answer]);

	const isBackVisible = selectedQuestion >= 1;
	const isSaveEnabled = answerValue.trim().length > 0;

	const handleSave = async () => {
		if (isSaveEnabled) {
			await updateFormInputs({ [questionKey]: answerValue.trim() });
		}
	};

	return (
		<div className="w-1/2">
			<AppCard className="flex flex-col space-y-5 gap-0 p-5 outline-1 outline-primary">
				<span className="text-app-black text-base font-semibold leading-tight">{question}</span>
				<TextareaField
					className="min-h-96 w-full focus:outline-app-gray-600 focus-visible:outline-app-gray-600 focus-visible:border-app-gray-600"
					onChange={(e) => {
						setAnswerValue(e.target.value);
					}}
					placeholder="Context and background of your research"
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

function IndexBadge({ index, isDisabled, state }: { index: number; isDisabled: boolean; state: QuestionState }) {
	if (state === "done") {
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
	index,
	onClick,
	question,
	state,
}: {
	index: number;
	onClick: () => void;
	question: string;
	state: QuestionState;
}) {
	const isDisabledState = state === "disabled";

	return (
		<AppCard
			className={`rounded cursor-pointer p-3 gap-0 transition-all duration-300 outline-1 ${isDisabledState ? "outline-app-gray-100" : "outline-primary group hover:outline-2 hover:outline-primary"}`}
			data-testid={`question-card-${index}`}
			onClick={onClick}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className="flex items-center gap-3">
				<IndexBadge index={index} isDisabled={isDisabledState} state={state} />
				<p className="flex-1 max-h-5 group-hover:max-h-20 transition-all duration-300 truncate group-hover:whitespace-normal text-app-black">
					{question}
				</p>
			</div>
		</AppCard>
	);
}

function QuestionsList({
	onSelectQuestion,
	selectedQuestion,
}: {
	onSelectQuestion: (index: number) => void;
	selectedQuestion: number;
}) {
	const formInputs = useApplicationStore((state) => state.application?.form_inputs ?? {}) as Record<string, unknown>;

	return (
		<div className="w-1/2 flex flex-col space-y-3 pb-2">
			{RESEARCH_QUESTIONS.map((item, index) => {
				const state = getQuestionState(index, item.key, selectedQuestion, formInputs);
				return (
					<QuestionCard
						index={index}
						key={item.key}
						onClick={() => {
							if (isQuestionAccessible(index, formInputs)) {
								onSelectQuestion(index);
							}
						}}
						question={item.question}
						state={state}
					/>
				);
			})}
		</div>
	);
}

function ResearchDeepDiveHeader({
	isAutofillLoading,
	onTriggerAutofill,
}: {
	isAutofillLoading: boolean;
	onTriggerAutofill: () => void;
}) {
	const application = useApplicationStore((state) => state.application);

	return (
		<div className="flex items-center justify-between mt-5 px-17 gap-4">
			<div className="flex flex-col">
				<h2
					className="text-app-black text-3xl font-medium font-heading leading-loose"
					data-testid="research-deep-dive-header"
				>
					Research Deep Dive
				</h2>
				<p
					className="text-app-black font-normal text-base leading-tight -mt-2"
					data-testid="research-deep-dive-description"
				>
					Before generating your grant application draft, it would be helpful to learn a bit more about your
					research to ensure more accurate results.
				</p>
			</div>
			<AppButton
				className="shrink-0"
				data-testid="ai-try-button"
				disabled={isAutofillLoading || !application}
				leftIcon={<Image alt="AI Try" height={16} src="/icons/button-logo.svg" width={16} />}
				onClick={onTriggerAutofill}
				variant="secondary"
			>
				{isAutofillLoading ? "Generating..." : "Let the AI Try!"}
			</AppButton>
		</div>
	);
}
