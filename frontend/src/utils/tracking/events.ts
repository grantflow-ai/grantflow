/**
 * Centralized event definitions for Segment tracking
 * Following naming convention: {category}-{action}-{target}
 */

export const TrackingEvents = {
	AI_AUTOFILL_USED: "ai-autofill-used",
	// Application Events
	APPLICATION_CREATE: "application-create",
	APPLICATION_DELETE: "application-delete",
	APPLICATION_GENERATE_COMPLETE: "application-generate-complete",

	APPLICATION_GENERATE_START: "application-generate-start",
	APPLICATION_VIEW: "application-view",
	COLLABORATION_SESSION_END: "collaboration-session-end",

	// Collaboration Events
	COLLABORATION_SESSION_START: "collaboration-session-start",
	CONTENT_GENERATED: "content-generated",
	CTA_NEW_APPLICATION_EMPTY: "empty-cta-new-application",

	// CTA Events
	CTA_NEW_APPLICATION_MAIN: "main-cta-new-application", // VSP-362
	CTA_NEW_APPLICATION_SIDEBAR: "sidebar-cta-new-application",
	// Error Events
	ERROR_API_CRITICAL: "error-api-critical",
	ERROR_AUTH_FAILED: "error-auth-failed",

	ERROR_GENERATION_FAILED: "error-generation-failed",
	// Document Management
	FILE_UPLOAD_COMPLETE: "file-upload-complete",
	MEMBER_ROLE_CHANGED: "member-role-changed",
	ONBOARDING_COMPLETE: "onboarding-complete",
	ONBOARDING_SKIP: "onboarding-skip",

	// Onboarding Events
	ONBOARDING_START: "onboarding-start-new", // Keep existing name for compatibility
	PAGE_VIEW_APPLICATION: "page-view-application",
	// Navigation Events
	PAGE_VIEW_DASHBOARD: "page-view-dashboard",
	PAGE_VIEW_EDITOR: "page-view-editor",
	PAGE_VIEW_LOGIN: "page-view-login",
	PAGE_VIEW_PROJECT: "page-view-project",

	PAGE_VIEW_SIGNUP: "page-view-signup",
	// Project Events
	PROJECT_CREATE: "project-create",
	PROJECT_INVITE_SENT: "project-invite-sent",
	PROJECT_MEMBER_JOINED: "project-member-joined",
	PROJECT_VIEW: "project-view",
	SOURCE_REMOVED: "source-removed",
	TEMPLATE_APPROVED: "template-approved",
	// AI & Generation Events
	TEMPLATE_GENERATE: "template-generate",
	URL_ADDED: "url-added",
	USER_EMAIL_VERIFIED: "user-email-verified",
	USER_LOGIN: "user-login",
	USER_LOGOUT: "user-logout",
	// User Events
	USER_SIGNUP: "user-signup",
	WIZARD_ABANDON: "wizard-abandon",
	WIZARD_COMPLETE: "wizard-complete",
	WIZARD_ERROR_BACK: "wizard-error-back",
	WIZARD_ERROR_CONTINUE: "wizard-error-continue",

	// Wizard Events
	WIZARD_START: "wizard-start",
	WIZARD_STEP_1_LINK: "wizard-step-1-link",
	WIZARD_STEP_1_NEXT: "wizard-step-1-next",
	WIZARD_STEP_1_UPLOAD: "wizard-step-1-upload",

	WIZARD_STEP_2_APPROVE: "wizard-step-2-approve",
	WIZARD_STEP_3_AI: "wizard-step-3-ai",
	WIZARD_STEP_3_LINK: "wizard-step-3-link",

	WIZARD_STEP_3_NEXT: "wizard-step-3-next",
	WIZARD_STEP_3_UPLOAD: "wizard-step-3-upload",
	WIZARD_STEP_4_ADD: "wizard-step-4-add",

	WIZARD_STEP_4_NEXT: "wizard-step-4-next",
	WIZARD_STEP_5_AI: "wizard-step-5-ai",
	WIZARD_STEP_5_GENERATE: "wizard-step-5-generate",
} as const;

export type TrackingEventKey = keyof typeof TrackingEvents;
export type TrackingEventValue = (typeof TrackingEvents)[TrackingEventKey];
