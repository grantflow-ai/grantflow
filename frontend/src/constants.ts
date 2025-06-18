export const ONE_MINUTE_IN_MS = 60 * 1000;
export const FIVE_SECONDS = 5 * 1000;
export const TEN_MINUTES = 10 * 60 * 1000;
export const ONE_HOUR_IN_SECONDS = 60 * 60;
export const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";

// Storage keys for persisted state
export const WIZARD_STORAGE_KEY = "grantflow-wizard-state";

export const WIZARD_STEP_TITLES = [
	"Application Details",
	"Application Structure",
	"Knowledge Base",
	"Research Plan",
	"Research Deep Dive",
	"Generate and Complete",
] as const;

export type WizardStepTitlesType = typeof WIZARD_STEP_TITLES;
