import type { API } from "@/types/api-types";

export type GrantSection = NonNullable<
	NonNullable<API.RetrieveApplication.Http200.ResponseBody["grant_template"]>
>["grant_sections"][0];

export type UpdateGrantSection = NonNullable<API.UpdateGrantTemplate.RequestBody["grant_sections"]>[0];

export const hasDetailedResearchPlan = (
	section: GrantSection,
): section is { is_detailed_research_plan: boolean | null } & GrantSection => {
	return Object.hasOwn(section, "is_detailed_research_plan");
};

export const hasGenerationInstructions = (
	section: GrantSection,
): section is { generation_instructions: string } & GrantSection => {
	return Object.hasOwn(section, "generation_instructions");
};

export const hasMaxWords = (section: GrantSection): section is { max_words: number } & GrantSection => {
	return Object.hasOwn(section, "max_words");
};

export const hasDetailedResearchPlanUpdate = (
	updates: Partial<GrantSection>,
): updates is { is_detailed_research_plan: boolean | null } & Partial<GrantSection> => {
	return Object.hasOwn(updates, "is_detailed_research_plan");
};
