import type { TrackingEvents } from "./events";

export interface BaseEventProperties {
	applicationId?: string;
	organizationId?: string;
	path?: string;
	projectId?: string;
	referrer?: string;
	sessionId: string;
	source?: string;
	timestamp: string;
	userId?: string;
}

export interface EventProperties {
	[TrackingEvents.AI_AUTOFILL_USED]: {
		fieldName: string;
	} & BaseEventProperties;

	[TrackingEvents.APPLICATION_CREATE]: {
		source: "empty-state" | "main-cta" | "onboarding" | "sidebar";
	} & BaseEventProperties;

	[TrackingEvents.APPLICATION_DELETE]: {
		applicationId: string;
	} & BaseEventProperties;

	[TrackingEvents.APPLICATION_GENERATE_COMPLETE]: {
		duration: number;
		generationType: "application" | "template";
		success: boolean;
	} & BaseEventProperties;

	[TrackingEvents.APPLICATION_GENERATE_START]: {
		generationType: "application" | "template";
	} & BaseEventProperties;

	[TrackingEvents.APPLICATION_VIEW]: {
		applicationId: string;
		applicationTitle?: string;
	} & BaseEventProperties;

	[TrackingEvents.COLLABORATION_SESSION_END]: {
		duration: number;
		participantCount: number;
	} & BaseEventProperties;

	[TrackingEvents.COLLABORATION_SESSION_START]: BaseEventProperties;

	[TrackingEvents.CONTENT_GENERATED]: {
		contentType: string;
		wordCount?: number;
	} & BaseEventProperties;

	[TrackingEvents.CTA_NEW_APPLICATION_EMPTY]: {
		source: "empty-state";
	} & BaseEventProperties;

	[TrackingEvents.CTA_NEW_APPLICATION_MAIN]: {
		source: "dashboard" | "project-actions-header" | "project-page";
	} & BaseEventProperties;

	[TrackingEvents.CTA_NEW_APPLICATION_SIDEBAR]: {
		source: "sidebar";
	} & BaseEventProperties;

	[TrackingEvents.ERROR_API_CRITICAL]: {
		endpoint: string;
		errorMessage: string;
		statusCode: number;
	} & BaseEventProperties;

	[TrackingEvents.ERROR_AUTH_FAILED]: {
		reason: string;
	} & BaseEventProperties;

	[TrackingEvents.ERROR_GENERATION_FAILED]: {
		errorMessage: string;
		generationType: "application" | "template";
	} & BaseEventProperties;

	[TrackingEvents.FILE_UPLOAD_COMPLETE]: {
		fileName: string;
		fileSize: number;
		fileType: string;
	} & BaseEventProperties;

	[TrackingEvents.MEMBER_ROLE_CHANGED]: {
		newRole: string;
		oldRole: string;
	} & BaseEventProperties;

	[TrackingEvents.ONBOARDING_COMPLETE]: {
		applicationId: string;
		projectId: string;
	} & BaseEventProperties;

	[TrackingEvents.ONBOARDING_SKIP]: BaseEventProperties;

	[TrackingEvents.ONBOARDING_START]: {
		isNewProject: boolean;
		projectName?: string;
	} & BaseEventProperties;
	[TrackingEvents.PAGE_VIEW_APPLICATION]: BaseEventProperties;
	[TrackingEvents.PAGE_VIEW_DASHBOARD]: BaseEventProperties;
	[TrackingEvents.PAGE_VIEW_EDITOR]: BaseEventProperties;
	[TrackingEvents.PAGE_VIEW_LOGIN]: BaseEventProperties;
	[TrackingEvents.PAGE_VIEW_PROJECT]: BaseEventProperties;

	[TrackingEvents.PAGE_VIEW_SIGNUP]: BaseEventProperties;

	[TrackingEvents.PROJECT_CREATE]: {
		fromOnboarding: boolean;
		projectName: string;
	} & BaseEventProperties;

	[TrackingEvents.PROJECT_INVITE_SENT]: {
		inviteeEmail: string;
		role: string;
	} & BaseEventProperties;

	[TrackingEvents.PROJECT_MEMBER_JOINED]: {
		role: string;
	} & BaseEventProperties;

	[TrackingEvents.PROJECT_VIEW]: {
		projectId: string;
		projectName?: string;
	} & BaseEventProperties;

	[TrackingEvents.SOURCE_REMOVED]: {
		sourceType: "file" | "url";
	} & BaseEventProperties;

	[TrackingEvents.TEMPLATE_APPROVED]: BaseEventProperties;

	[TrackingEvents.TEMPLATE_GENERATE]: BaseEventProperties;

	[TrackingEvents.URL_ADDED]: {
		domain: string;
	} & BaseEventProperties;

	[TrackingEvents.USER_EMAIL_VERIFIED]: BaseEventProperties;

	[TrackingEvents.USER_LOGIN]: {
		method: "email" | "github" | "google";
	} & BaseEventProperties;

	[TrackingEvents.USER_LOGOUT]: BaseEventProperties;

	[TrackingEvents.USER_SIGNUP]: {
		method: "email" | "github" | "google";
		referralSource?: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_ABANDON]: {
		duration: number;
		lastStep: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_COMPLETE]: {
		duration: number;
		stepsCompleted: number;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_ERROR_BACK]: {
		errorMessage?: string;
		errorType: string;
		validationErrors?: string[];
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_ERROR_CONTINUE]: {
		errorMessage?: string;
		errorType: string;
		validationErrors?: string[];
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_START]: BaseEventProperties;
	[TrackingEvents.WIZARD_STEP_1_LINK]: {
		domain: string;
		url: string;
	} & BaseEventProperties;
	[TrackingEvents.WIZARD_STEP_1_NEXT]: BaseEventProperties;
	[TrackingEvents.WIZARD_STEP_1_UPLOAD]: {
		fileName: string;
		fileSize: number;
		fileType: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_2_APPROVE]: {
		sectionsCount: number;
		templateId: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_3_AI]: {
		aiType: "autofill" | "generation" | "preview";
		fieldName?: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_3_LINK]: {
		domain: string;
		url: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_3_NEXT]: BaseEventProperties;
	[TrackingEvents.WIZARD_STEP_3_UPLOAD]: {
		fileName: string;
		fileSize: number;
		fileType: string;
	} & BaseEventProperties;
	[TrackingEvents.WIZARD_STEP_4_ADD]: {
		contentType: string;
		fieldName: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_4_NEXT]: BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_5_AI]: {
		aiType: "autofill" | "generation" | "preview";
		fieldName?: string;
	} & BaseEventProperties;

	[TrackingEvents.WIZARD_STEP_5_GENERATE]: {
		generationType: "application" | "template";
	} & BaseEventProperties;
}

export type TrackableEvent = keyof EventProperties;
