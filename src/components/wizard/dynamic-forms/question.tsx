import { getInputComponent, type InputType, type ValueType } from "@/components/wizard/dynamic-forms/inputs";
import { Label } from "gen/ui/label";
import type { QuestionData } from "@/components/wizard/dynamic-forms/types";

export function Question({
	handleAnswerChange,
	answerType,
	questionId,
	questionText,
	required,
	maxLength,
	allowFileUpload,
	disabled,
	value,
}: QuestionData & {
	disabled: boolean;
	handleAnswerChange: (questionId: number, value: ValueType) => void;
	value: ValueType;
}) {
	const InputComponent = getInputComponent(answerType);
	return (
		<div key={questionId} className="space-y-2">
			<Label htmlFor={`question-${questionId}`}>{questionText}</Label>
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
				<input type="file" id={`file-${questionId}`} data-testid={`file-upload-${questionId}`} className="mt-2" />
			)}
		</div>
	);
}
