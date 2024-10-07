
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import { FileUploadContainer } from "@/components/file-upload-container";
import { getInputComponent, type InputType, type ValueType } from "@/components/wizard/dynamic-forms/inputs";
import type { QuestionData } from "@/components/wizard/dynamic-forms/types";
import type { FileData } from "@/types";

const TWENTY_MB = 20 * 1024 * 1024;

function Question({
	handleAnswerChange,
	answerType,
	questionId,
	required,
	maxLength,
	allowFileUpload,
	disabled,
	value,
	setFileIds,
	maxFileCount = 5,
	files,
}: Omit<QuestionData, "questionText"> & {
	disabled: boolean;
	handleAnswerChange: (questionId: number, value: ValueType) => void;
	value: ValueType;
	files?: FileData[];
	setFileIds: (questionId: number, filesIds: string[]) => void;
	maxFileCount?: number;
}) {
	const InputComponent = getInputComponent(answerType);
	return (
		<div className="space-y-2 p-1">
			<InputComponent
				questionId={questionId}
				required={required}
				maxLength={maxLength}
				onValueChange={(value) => {
					handleAnswerChange(questionId, value);
				}}
				disabled={disabled}
				value={value as InputType<typeof answerType>}
			/>
			{allowFileUpload && (
				<FileUploadContainer
					maxSize={TWENTY_MB}
					maxFileCount={maxFileCount}
					initialValue={files}
					setFileIds={(fileIds) => {
						setFileIds(questionId, fileIds);
					}}
					parentId={`question-${questionId}`}
				/>
			)}
		</div>
	);
}

const isQuestionEnabled = (dependsOn: QuestionData["dependsOn"], answers: Record<number, ValueType>) => {
	if (!dependsOn) {
		return true;
	}
	if (Array.isArray(dependsOn)) {
		return dependsOn.every((dependencyId) => answers[dependencyId] !== undefined);
	}
	return answers[dependsOn] !== undefined;
};

export default function QuestionsAccordion({
	questions,
	answers,
	handleAnswerChange,
	setFileIds,
}: {
	questions: QuestionData[];
	answers: Record<number, ValueType>;
	handleAnswerChange: (questionId: number, value: ValueType) => void;
	setFileIds: (questionId: number, fileIds: string[]) => void;
}) {
	const [openItems, setOpenItems] = useState<string[]>([]);

	const toggleAccordion = (value: string) => {
		setOpenItems((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
	};

	return (
		<Accordion type="multiple" value={openItems} className="w-full md:w-3/4 space-y-6" data-testid="form-content">
			{questions.map(({ allowFileUpload, answerType, dependsOn, questionId, questionText, required }) => (
				<AccordionItem key={questionId} value={`question-${questionId}`}>
					<AccordionTrigger
						onClick={() => {
							toggleAccordion(`question-${questionId}`);
						}}
					>
						{questionText}
					</AccordionTrigger>
					<AccordionContent>
						<Question
							answerType={answerType}
							questionId={questionId}
							required={required}
							allowFileUpload={allowFileUpload}
							dependsOn={dependsOn}
							handleAnswerChange={handleAnswerChange}
							disabled={!isQuestionEnabled(dependsOn, answers)}
							value={answers[questionId]}
							setFileIds={setFileIds}
						/>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
