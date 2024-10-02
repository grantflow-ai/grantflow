export interface QuestionData {
	questionId: number;
	questionText: string;
	required: boolean;
	allowFileUpload: boolean;
	dependsOn: number | number[] | null;
	answerType: "text" | "boolean" | "date-range" | "date";
	maxLength?: number | null;
}

export interface SectionData {
	sectionId: number;
	name: string;
	description: string;
	questions: QuestionData[];
}
