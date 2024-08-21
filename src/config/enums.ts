export enum PagePath {
	ROOT = "/",
	AUTH = "/auth",
	AUTH_FORGOT_PASSWORD = "/auth/forgot-password",
	AUTH_UPDATE_PASSWORD = "/auth/update-password",
}

export enum ApiPath {
	CALLBACK_OPENID = "/auth/callbacks/openid",
	CALLBACK_PASSWORD_RESET = "/auth/callbacks/password-reset",
}

export enum AuthMethod {
	PASSWORD_SIGNIN = "PASSWORD_SIGNIN",
	EMAIL_SIGNIN = "EMAIL_SIGNIN",
	OAUTH_SIGNIN = "OAUTH_SIGNIN",
}
