import type { HTTPError } from "ky";
import { z } from "zod";

export const isValidUrl = (url: string): boolean => {
	const urlResult = z.url().safeParse(url);
	return urlResult.success;
};

interface ValidationErrorResponse {
	detail?: string;
}

const GRANT_TEMPLATE_ERROR_MESSAGES = {
	NO_RAG_SOURCES: "No rag sources found for grant template, cannot generate",
	TEMPLATE_NOT_FOUND: "Grant template not found",
} as const;

export const extractGrantTemplateValidationError = async (httpError: HTTPError): Promise<false | string> => {
	try {
		if (httpError.response.status !== 422) {
			return false;
		}

		const responseData = await httpError.response.json();

		if (typeof responseData !== "object" || responseData === null || !("detail" in responseData)) {
			return false;
		}

		const errorData = responseData as ValidationErrorResponse;
		const { detail } = errorData;

		if (typeof detail !== "string") {
			return false;
		}

		const isKnownError =
			detail.includes(GRANT_TEMPLATE_ERROR_MESSAGES.TEMPLATE_NOT_FOUND) ||
			detail.includes(GRANT_TEMPLATE_ERROR_MESSAGES.NO_RAG_SOURCES);

		return isKnownError ? detail : false;
	} catch {
		return false;
	}
};
