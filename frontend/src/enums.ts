export enum PagePath {
	ABOUT_US = "/about",
	APPLICATION_DETAIL = "/projects/:projectId/applications/:applicationId",
	APPLICATION_WIZARD = "/projects/:projectId/applications/:applicationId/wizard",
	FINISH_EMAIL_SIGNIN = "/onboarding/email",
	IMPRINT = "/imprint",
	LOGIN = "/login",
	ONBOARDING = "/onboarding",
	PRIVACY = "/privacy",
	PROJECT_DETAIL = "/projects/:projectId",
	PROJECTS = "/projects",
	ROOT = "/",
	TERMS = "/terms",
}

export enum SourceIndexingStatus {
	FAILED = "FAILED",
	FINISHED = "FINISHED",
	INDEXING = "INDEXING",
}

export enum WAITING_LIST_RESPONSE_CODES {
	SERVER_ERROR = "SERVER_ERROR",
	SUCCESS = "SUCCESS",
	VALIDATION_ERROR = "VALIDATION_ERROR",
}