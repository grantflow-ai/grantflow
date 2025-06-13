import { API } from "@/types/api-types";

// @Varun, this logic should go to the store when its in place.

export const MIN_TITLE_LENGTH = 10;
export type ApplicationType =
	| API.CreateApplication.Http201.ResponseBody
	| API.RetrieveApplication.Http200.ResponseBody
	| null;
export const validateStepNext = ({
	application,
	currentStep,
	hadUrls,
	hasFiles,
	isGenerating,
}: {
	application: ApplicationType | null;
	currentStep: number;
	hadUrls: boolean;
	hasFiles: boolean;
	isGenerating: boolean;
}) => {
	if (!application || isGenerating) {
		return false;
	}
	if (currentStep === 0) {
		return application.title.trim().length >= MIN_TITLE_LENGTH && (hadUrls || hasFiles);
	}
	if (currentStep === 1) {
		return !!application.grant_template?.grant_sections.length;
	}
	if (currentStep === 2) {
		return (
			!!application.rag_sources.length && application.rag_sources.every((source) => source.status !== "FAILED")
		);
	}
};
