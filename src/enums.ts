export enum PagePath {
	ROOT = "/",
	SIGNIN = "/sign-in",
	FINISH_EMAIL_SIGNIN = "/sign-in/email",
	WORKSPACES = "/workspaces",
	WORKSPACE_DETAIL = "/workspaces/:workspaceId",
	NEW_APPLICATION = "/workspaces/:workspaceId/applications/new",
	APPLICATION_DETAIL = "/workspaces/:workspaceId/applications/:applicationId",
}

export enum ApiPath {
	LOGIN = "/api/login",
}
