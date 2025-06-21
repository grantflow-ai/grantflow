export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";
export const WIZARD_STORAGE_KEY = "grantflow-wizard-state";

export enum WizardStep {
	APPLICATION_DETAILS = "Application Details",
	APPLICATION_STRUCTURE = "Application Structure",
	GENERATE_AND_COMPLETE = "Generate and Complete",
	KNOWLEDGE_BASE = "Knowledge Base",
	RESEARCH_DEEP_DIVE = "Research Deep Dive",
	RESEARCH_PLAN = "Research Plan",
}

export const WIZARD_STEP_TITLES = [
	WizardStep.APPLICATION_DETAILS,
	WizardStep.APPLICATION_STRUCTURE,
	WizardStep.KNOWLEDGE_BASE,
	WizardStep.RESEARCH_PLAN,
	WizardStep.RESEARCH_DEEP_DIVE,
	WizardStep.GENERATE_AND_COMPLETE,
] as const;
