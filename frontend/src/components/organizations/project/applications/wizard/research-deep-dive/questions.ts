import type { FormInputKeys } from "@/types/grant-sections";

export interface QuestionConfig {
	key: Exclude<FormInputKeys, "type">;
	question: string;
}

export const BASIC_SCIENCE_QUESTIONS: QuestionConfig[] = [
	{
		key: "background_context",
		question: "What is the context and background of your research?",
	},
	{
		key: "hypothesis",
		question: "What is the central hypothesis or key question your research aims to address?",
	},
	{
		key: "rationale",
		question: "Why is this research important and what motivates its pursuit?",
	},
	{
		key: "novelty_and_innovation",
		question: "What makes your approach unique or innovative compared to existing research?",
	},
	{
		key: "impact",
		question: "How will your research contribute to the field and society?",
	},
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

export const TRANSLATIONAL_RESEARCH_QUESTIONS: QuestionConfig[] = [
	{
		key: "unmet_need_context",
		question: "What is the context and unmet need your project addresses?",
	},
	{
		key: "core_concept",
		question: "What is the core concept or technology your project aims to develop or validate?",
	},
	{
		key: "translational_potential",
		question: "Why is this innovation important and what drives its translational potential?",
	},
	{
		key: "unique_approach",
		question: "What makes your solution or approach unique compared to existing alternatives or competitors?",
	},
	{
		key: "translational_impact",
		question:
			"How will your project generate impact — scientifically, clinically, or economically — and benefit society or patients?",
	},
	{
		key: "team_translation_capability",
		question:
			"What makes your team and partners uniquely suited to translate this innovation to application or market?",
	},
	{
		key: "commercialization_plan",
		question: "What makes your development and commercialization plan feasible and sustainable?",
	},
	{
		key: "proof_of_concept",
		question:
			"Have you obtained any proof-of-concept, pilot data, or early validation supporting feasibility or market interest?",
	},
];

export const BASIC_SCIENCE_PLACEHOLDERS: Partial<Record<FormInputKeys, string>> = {
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

export const TRANSLATIONAL_RESEARCH_PLACEHOLDERS: Partial<Record<FormInputKeys, string>> = {
	commercialization_plan: "Outline your development and commercialization plan...",
	core_concept: "Outline the core concept or technology you aim to develop or validate...",
	proof_of_concept: "Share any proof-of-concept, pilot data, or early validation you have obtained...",
	team_translation_capability: "Explain what makes your team uniquely suited for translating this innovation...",
	translational_impact: "Describe the scientific, clinical, or economic impact your project will generate...",
	translational_potential: "Explain the importance and translational potential of this innovation...",
	unique_approach: "Highlight what makes your solution unique compared to existing alternatives...",
	unmet_need_context: "Describe the context and unmet need your project addresses...",
};
