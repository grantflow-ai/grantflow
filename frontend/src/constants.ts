export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";
export const SELECTED_ORGANIZATION_COOKIE = "grantflow_selected_organization";
export const COOKIE_CONSENT = "grantflow_cookie_consent";
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

export enum WizardStep {
	APPLICATION_DETAILS = "Application Details",
	APPLICATION_STRUCTURE = "Application Structure",
	GENERATE_AND_COMPLETE = "Generate and Complete",
	KNOWLEDGE_BASE = "Knowledge Base",
	RESEARCH_DEEP_DIVE = "Research Deep Dive",
	RESEARCH_PLAN = "Research Plan",
}

export const PROGRESS_BAR_STEPS = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.APPLICATION_STRUCTURE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
] as const;
