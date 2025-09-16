import type { WizardStep } from "@/constants";

export enum WizardAnalyticsEvent {
	ERROR_BACK = "error-back",
	ERROR_CONTINUE = "error-continue",
	ONBOARDING_START_NEW = "onboarding-start-new",
	STEP_1_LINK = "1-step-link",
	STEP_1_NEXT = "1-step-next",
	STEP_1_UPLOAD = "1-step-upload",
	STEP_2_APPROVE = "2-step-approve",
	STEP_3_AI = "3-step-AI",
	STEP_3_LINK = "3-step-link",
	STEP_3_NEXT = "3-step-next",
	STEP_3_UPLOAD = "3-step-upload",
	STEP_4_ADD = "4-step-add",
	STEP_4_NEXT = "4-step-next",
	STEP_5_AI = "5-step-AI",
	STEP_5_GENERATE = "5-step-generate",
}

export type TrackableWizardEvent = keyof WizardEventProperties;

export interface WizardAnalyticsContext {
	applicationId?: string;
	currentStep?: WizardStep;
	organizationId: string;
	projectId?: string;
}

export interface WizardEventProperties {
	[WizardAnalyticsEvent.ERROR_BACK]: ErrorEventProperties;
	[WizardAnalyticsEvent.ERROR_CONTINUE]: ErrorEventProperties;
	[WizardAnalyticsEvent.ONBOARDING_START_NEW]: {
		isNewProject: boolean;
		projectName?: string;
	} & BaseEventProperties;
	[WizardAnalyticsEvent.STEP_1_LINK]: LinkEventProperties;
	[WizardAnalyticsEvent.STEP_1_NEXT]: BaseEventProperties;
	[WizardAnalyticsEvent.STEP_1_UPLOAD]: FileUploadEventProperties;
	[WizardAnalyticsEvent.STEP_2_APPROVE]: {
		sectionsCount: number;
		templateId: string;
	} & BaseEventProperties;
	[WizardAnalyticsEvent.STEP_3_AI]: AIEventProperties;
	[WizardAnalyticsEvent.STEP_3_LINK]: LinkEventProperties;
	[WizardAnalyticsEvent.STEP_3_NEXT]: BaseEventProperties;
	[WizardAnalyticsEvent.STEP_3_UPLOAD]: FileUploadEventProperties;
	[WizardAnalyticsEvent.STEP_4_ADD]: ContentAddEventProperties;
	[WizardAnalyticsEvent.STEP_4_NEXT]: BaseEventProperties;
	[WizardAnalyticsEvent.STEP_5_AI]: AIEventProperties;
	[WizardAnalyticsEvent.STEP_5_GENERATE]: {
		generationType: "application" | "template";
	} & BaseEventProperties;
}

interface AIEventProperties extends BaseEventProperties {
	aiType: "autofill" | "generation" | "preview";
	fieldName?: string;
}

interface BaseEventProperties {
	applicationId?: string;
	currentStep?: WizardStep;
	organizationId: string;
	projectId?: string;
	timestamp: string;
}

interface ContentAddEventProperties extends BaseEventProperties {
	contentType: string;
	fieldName: string;
}

interface ErrorEventProperties extends BaseEventProperties {
	errorMessage?: string;
	errorType: string;
	validationErrors?: string[];
}

interface FileUploadEventProperties extends BaseEventProperties {
	fileName: string;
	fileSize: number;
	fileType: string;
}

interface LinkEventProperties extends BaseEventProperties {
	domain: string;
	url: string;
}
