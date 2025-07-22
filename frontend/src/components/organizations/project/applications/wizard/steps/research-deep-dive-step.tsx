"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AppCard, TextareaField } from "@/components/app";
import { AppButton } from "@/components/app/buttons/app-button";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";

type FormInputs = NonNullable<API.RetrieveApplication.Http200.ResponseBody["form_inputs"]>;
type FormInputsKey = keyof FormInputs;

const getDisabledTextColorClass = (): string => "text-app-gray-400";
const getEnabledTextColorClass = (): string => "text-app-black";

const placeholders: Record<FormInputsKey, string> = {
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
				<QuestionsList onSelectQuestion={setSelectedQuestion} />

				<AnswerCard
					key={selectedQuestion}
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
	const formInputs = (useApplicationStore((state) => state.application?.form_inputs) ?? {}) as FormInputs;

	const { key: questionKey, question } = RESEARCH_QUESTIONS[selectedQuestion];
	const formInputsAnswer = formInputs[questionKey] || "";

	const [answerValue, setAnswerValue] = useState(formInputsAnswer);

	const isBackVisible = selectedQuestion >= 1;
	const isSaveEnabled = answerValue.trim().length > 0;

	const handleSave = async () => {
		if (isSaveEnabled) {
			await updateFormInputs({ [questionKey]: answerValue.trim() });
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

function QuestionsList({ onSelectQuestion }: { onSelectQuestion: (index: number) => void }) {
	const formInputs = (useApplicationStore((state) => state.application?.form_inputs) ?? {}) as FormInputs;

	let lastAnswered = -1;

	return (
		<ul className="w-1/2 flex flex-col space-y-3 pb-2">
			{RESEARCH_QUESTIONS.map((item, index) => {
				const answerValue = formInputs[item.key];
				const hasAnswer = answerValue && answerValue.trim().length > 0;

				if (hasAnswer) {
					lastAnswered = index;
				}

				const isDisabled = index > 0 && !hasAnswer && index > lastAnswered + 1;

				return (
					<QuestionCard
						hasAnswer={Boolean(hasAnswer)}
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
