/** biome-ignore-all assist/source/useSortedKeys: wizard steps must not be sorted to maintain order in UI */
export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";
export const SELECTED_ORGANIZATION_COOKIE = "grantflow_selected_organization";
export const BACKOFFICE_ADMIN_COOKIE = "grantflow_backoffice_admin";
export const COOKIE_CONSENT = "grantflow_cookie_consent";
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

/* eslint-disable perfectionist/sort-objects */
export const WizardStep = {
	APPLICATION_DETAILS: "Application Details",
	APPLICATION_STRUCTURE: "Application Structure",
	KNOWLEDGE_BASE: "Knowledge Base",
	RESEARCH_PLAN: "Research Plan",
	RESEARCH_DEEP_DIVE: "Research Deep Dive",
	GENERATE_AND_COMPLETE: "Generate and Complete",
} as const;
/* eslint-enable perfectionist/sort-objects */

export type WizardStep = (typeof WizardStep)[keyof typeof WizardStep];

export const WIZARD_STEPS = Object.values(WizardStep);
