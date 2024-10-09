import { GrantApplicationQuestion } from "@/types/database-types";
import { getInputComponent, type InputType, ValueType } from "@/components/wizard/dynamic-forms/form-components";
import type { FileData } from "@/types";
import { FileUploadContainer } from "@/components/file-upload-container";

const TWENTY_MB = 20 * 1024 * 1024;

export function QuestionInputs({
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
