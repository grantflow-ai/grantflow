export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";
export const WIZARD_STORAGE_KEY = "grantflow-wizard-state";
export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

export enum WizardStep {
	APPLICATION_DETAILS = "Application Details",
	GENERATE_AND_COMPLETE = "Generate and Complete",
	KNOWLEDGE_BASE = "Knowledge Base",
	PREVIEW_AND_APPROVE = "Preview and Approve",
	RESEARCH_DEEP_DIVE = "Research Deep Dive",
	RESEARCH_PLAN = "Research Plan",
}

export const PROGRESS_BAR_STEPS = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.PREVIEW_AND_APPROVE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
] as const;
