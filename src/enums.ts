export enum PagePath {
	ROOT = "/",
	AUTH = "/auth",
	WORKSPACES = "/workspaces",
	APPLICATIONS = "/applications",
}

export enum ApiPath {
	CALLBACK_OPENID = "/auth/openid",
	CALLBACK_MAGIC_LINK = "/auth/email-signin",
	LOGOUT = "/auth/logout",
}
