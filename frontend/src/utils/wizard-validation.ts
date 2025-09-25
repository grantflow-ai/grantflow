const MIN_TITLE_LENGTH = 10;

export enum ApplicationDetailsValidationReason {
	RAG_SOURCES_MISSING = "RAG_SOURCES_MISSING",
	TITLE_INVALID = "TITLE_INVALID",
	VALID = "VALID",
}

export interface ApplicationDetailsValidationResult {
	isValid: boolean;
	processingCount?: number;
	reason: ApplicationDetailsValidationReason;
	totalCount?: number;
}

export function validateApplicationDetailsStep(
	title: string | undefined,
	ragSources: { status: string }[] | undefined,
): ApplicationDetailsValidationResult {
	const titleValid = !!(title && title.trim().length >= MIN_TITLE_LENGTH);
	if (!titleValid) {
		return { isValid: false, reason: ApplicationDetailsValidationReason.TITLE_INVALID };
	}

	const ragSourcesExist = !!(ragSources && ragSources.length > 0);
	if (!ragSourcesExist) {
		return { isValid: false, reason: ApplicationDetailsValidationReason.RAG_SOURCES_MISSING };
	}

	return { isValid: true, reason: ApplicationDetailsValidationReason.VALID };
}
