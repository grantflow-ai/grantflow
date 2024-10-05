import { FileUploadContainer } from "@/components/file-upload-container";
import { type InputType, type ValueType, getInputComponent } from "@/components/wizard/dynamic-forms/inputs";
import type { QuestionData } from "@/components/wizard/dynamic-forms/types";
import type { FileData } from "@/types";
import { Label } from "gen/ui/label";

const TWENTY_MB = 20 * 1024 * 1024;

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
	setFileIds,
	maxFileCount = 5,
	files,
}: QuestionData & {
	disabled: boolean;
	handleAnswerChange: (questionId: number, value: ValueType) => void;
	value: ValueType;
	files?: FileData[];
	setFileIds: (questionId: number, filesIds: string[]) => void;
	maxFileCount?: number;
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
