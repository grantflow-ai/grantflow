export enum PagePath {
	ROOT = "/",
	SIGNIN = "/sign-in",
	FINISH_EMAIL_SIGNIN = "/sign-in/email",
	WORKSPACES = "/workspaces",
	WORKSPACE_DETAIL = "/workspaces/:workspaceId",
	APPLICATIONS = "/workspaces/:workspaceId/applications",
	APPLICATION_DETAIL = "/workspaces/:workspaceId/applications/:applicationId",
}

export enum ApiPath {
	LOGOUT = "/logout",
}
