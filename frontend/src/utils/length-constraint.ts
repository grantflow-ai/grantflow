import type { API } from "@/types/api-types";

export interface SectionLengthConstraint {
	source: null | string;
	type: "characters" | "words";
	value: number;
}

type UpdateSection = NonNullable<API.UpdateGrantTemplate.RequestBody["grant_sections"]>[number];

export const AVERAGE_CHARACTERS_PER_WORD = 6.5;

export const wordsToCharacters = (words: number): number =>
	Math.max(0, Math.round(words * AVERAGE_CHARACTERS_PER_WORD));

export const charactersToWords = (characters: number): number =>
	Math.max(1, Math.round(characters / AVERAGE_CHARACTERS_PER_WORD));

const normalize = (value: number): number => Math.max(0, Math.round(value));

export const constraintToWordLimit = (constraint?: null | SectionLengthConstraint): null | number => {
	if (!constraint) {
		return null;
	}

	if (constraint.type === "words") {
		return normalize(constraint.value);
	}

	return charactersToWords(constraint.value);
};

export const createLengthConstraint = (
	value: number,
	type: SectionLengthConstraint["type"] = "words",
	source: null | string | undefined = null,
): SectionLengthConstraint => ({
	source: source ?? null,
	type,
	value: normalize(value),
});

export const updateLengthConstraintValue = (
	constraint: null | SectionLengthConstraint | undefined,
	value: number,
	type: SectionLengthConstraint["type"] = constraint?.type ?? "words",
): SectionLengthConstraint => createLengthConstraint(value, type, constraint?.source ?? null);

export const setLengthConstraintWordLimit = (
	constraint: null | SectionLengthConstraint | undefined,
	wordLimit: number,
): SectionLengthConstraint => {
	const type = constraint?.type ?? "words";
	const source = constraint?.source ?? null;
	const value = type === "words" ? normalize(wordLimit) : wordsToCharacters(wordLimit);
	return createLengthConstraint(value, type, source);
};

export function hasLengthConstraint<T extends { length_constraint?: null | SectionLengthConstraint }>(
	value: T,
): value is { length_constraint: SectionLengthConstraint } & T;
export function hasLengthConstraint(value: unknown): value is { length_constraint: SectionLengthConstraint };
export function hasLengthConstraint(value: unknown): value is { length_constraint: SectionLengthConstraint } {
	if (typeof value !== "object" || value === null || !("length_constraint" in value)) {
		return false;
	}
	const constraint = (value as { length_constraint?: null | SectionLengthConstraint }).length_constraint;
	return constraint != null;
}

export const deriveLengthConstraintForUpdate = (
	section: UpdateSection,
	value: number,
	type: SectionLengthConstraint["type"],
): SectionLengthConstraint => {
	const source = hasLengthConstraint(section) ? section.length_constraint.source : null;
	return createLengthConstraint(value, type, source);
};
