import type { GrantSection } from "@/types/grant-sections";

export const hasKeywords = (section: GrantSection): section is { keywords: string[] } & GrantSection => {
	return Object.hasOwn(section, "keywords");
};

export const hasSearchQueries = (section: GrantSection): section is { search_queries: string[] } & GrantSection => {
	return Object.hasOwn(section, "search_queries");
};
