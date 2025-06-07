export enum PagePath {
	ABOUT_US = "/about",
	APPLICATION_DETAIL = "/workspaces/:workspaceId/applications/:applicationId",
	FINISH_EMAIL_SIGNIN = "/onboarding/email",
	IMPRINT = "/imprint",
	LOGIN = "/login",
	NEW_APPLICATION = "/workspaces/:workspaceId/applications/new",
	ONBOARDING = "/onboarding",
	PRIVACY = "/privacy",
	ROOT = "/",
	TERMS = "/terms",
	WORKSPACE_DETAIL = "/workspaces/:workspaceId",
	WORKSPACES = "/workspaces",
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
