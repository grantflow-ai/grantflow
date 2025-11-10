import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";

export const hasKeywords = (
	section: GrantSection | UpdateGrantSection,
): section is { keywords: string[] } & (GrantSection | UpdateGrantSection) => {
	return Object.hasOwn(section, "keywords");
};

export const hasSearchQueries = (
	section: GrantSection | UpdateGrantSection,
): section is { search_queries: string[] } & (GrantSection | UpdateGrantSection) => {
	return Object.hasOwn(section, "search_queries");
};
