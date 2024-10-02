import sectionsData from "@/components/wizard/dynamic-forms/sections.json";
import questionsData from "@/components/wizard/dynamic-forms/questions.json";

import { z } from "zod";
import DynamicWizard from "@/components/wizard/dynamic-forms/dynamic-wizard";
import { SectionData } from "@/components/wizard/dynamic-forms/types";

const QuestionSchema = z.object({
	questionId: z.number(),
	questionText: z.string(),
	required: z.boolean(),
	allowFileUpload: z.boolean(),
	dependsOn: z.number().or(z.array(z.number())).nullable(),
	answerType: z.enum(["text", "boolean", "date-range", "date"]),
	maxLength: z.number().nullable(),
});

const SectionSchema = z.object({
	sectionId: z.number(),
	name: z.string(),
	description: z.string(),
});

const QuestionsSchema = z.record(z.string(), z.array(QuestionSchema));
const SectionsArraySchema = z.array(SectionSchema);

export default function GrantWizard() {
	const questions = QuestionsSchema.parse(questionsData);
	const sections = SectionsArraySchema.parse(sectionsData);

	const sectionsWithQuestions: SectionData[] = sections.map((section) => ({
		...section,
		questions: questions[section.name],
	}));

	return (
		<section className="flex justify-center">
			<DynamicWizard sections={sectionsWithQuestions} />
		</section>
	);
}
