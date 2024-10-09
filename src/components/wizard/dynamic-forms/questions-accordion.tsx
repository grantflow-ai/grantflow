import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "gen/ui/accordion";
import { type ValueType } from "@/components/wizard/dynamic-forms/form-components";
import { GrantApplicationQuestion } from "@/types/database-types";
import { QuestionInputs } from "@/components/wizard/dynamic-forms/question-inputs";

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
						<QuestionInputs
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
