export enum PagePath {
	ABOUT_US = "/about",
	APPLICATION_DETAIL = "/projects/:projectId/applications/:applicationId",
	APPLICATION_EDIT = "/projects/:projectId/applications/:applicationId/edit",
	APPLICATION_EDITOR = "/projects/:projectId/applications/:applicationId/editor",
	APPLICATION_WIZARD = "/projects/:projectId/applications/:applicationId/wizard",
	DASHBOARD = "/dashboard",
	FINISH_EMAIL_SIGNIN = "/onboarding/email",
	IMPRINT = "/imprint",
	LOGIN = "/login",
	ONBOARDING = "/onboarding",
	PRIVACY = "/privacy",
	PROJECT_DETAIL = "/projects/:projectId",
	PROJECT_SETTINGS_ACCOUNT = "/projects/:projectId/settings/account",
	PROJECT_SETTINGS_BILLING = "/projects/:projectId/settings/billing",
	PROJECT_SETTINGS_MEMBERS = "/projects/:projectId/settings/members",
	PROJECT_SETTINGS_NOTIFICATIONS = "/projects/:projectId/settings/notifications",
	PROJECTS = "/projects",
	ROOT = "/",
	TERMS = "/terms",
}

export enum SourceIndexingStatus {
	FAILED = "FAILED",
	FINISHED = "FINISHED",
	INDEXING = "INDEXING",
}
