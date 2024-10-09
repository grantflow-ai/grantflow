import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import { FileUploadContainer } from "@/components/file-upload-container";
import { getInputComponent, type InputType, type ValueType } from "@/components/wizard/dynamic-forms/inputs";
import type { FileData } from "@/types";
import { GrantApplicationQuestion } from "@/types/database-types";

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
}: {
	answerType: GrantApplicationQuestion["input_type"];
	questionId: GrantApplicationQuestion["id"];
	maxLength: GrantApplicationQuestion["max_length"];
	allowFileUpload: GrantApplicationQuestion["file_upload"];
	required: GrantApplicationQuestion["required"];
	dependsOn: GrantApplicationQuestion["depends_on"];
	disabled: boolean;
	handleAnswerChange: (questionId: string, value: ValueType) => void;
	value: ValueType;
	files?: FileData[];
	setFileIds: (questionId: string, filesIds: string[]) => void;
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

const isQuestionEnabled = (dependsOn: GrantApplicationQuestion["depends_on"], answers: Record<string, ValueType>) => {
	if (!dependsOn) {
		return true;
	}
	if (Array.isArray(dependsOn)) {
		return dependsOn.every((dependencyId) => answers[dependencyId] !== undefined);
	}
	return answers[dependsOn] !== undefined;
};

export function QuestionsAccordion({
	questions,
	answers,
	handleAnswerChange,
	setFileIds,
}: {
	questions: GrantApplicationQuestion[];
	answers: Record<string, ValueType>;
	handleAnswerChange: (questionId: string, value: ValueType) => void;
	setFileIds: (questionId: string, fileIds: string[]) => void;
}) {
	const [openItems, setOpenItems] = useState<string[]>([]);

	const toggleAccordion = (value: string) => {
		setOpenItems((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
	};

	return (
		<Accordion type="multiple" value={openItems} className="w-full md:w-3/4 space-y-6" data-testid="form-content">
			{questions.map(({ file_upload, input_type, depends_on, max_length, id, text, required }) => (
				<AccordionItem key={id} value={`question-${id}`}>
					<AccordionTrigger
						onClick={() => {
							toggleAccordion(`question-${id}`);
						}}
					>
						{text}
					</AccordionTrigger>
					<AccordionContent>
						<Question
							answerType={input_type}
							questionId={id}
							required={required}
							allowFileUpload={file_upload}
							dependsOn={depends_on}
							maxLength={max_length}
							handleAnswerChange={handleAnswerChange}
							disabled={!isQuestionEnabled(depends_on, answers)}
							value={answers[id]}
							setFileIds={setFileIds}
						/>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
