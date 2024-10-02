export interface Question {
	questionId: number;
	questionText: string;
	required: boolean;
	allowFileUpload: boolean;
	dependsOn: number | number[] | null;
	answerType: "text" | "boolean" | "date-range" | "date";
	maxLength?: number | null;
}

export interface Section {
	sectionId: number;
	name: string;
	description: string;
	questions: Question[];
}
