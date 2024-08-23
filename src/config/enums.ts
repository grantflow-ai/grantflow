export enum PagePath {
	ROOT = "/",
	AUTH = "/auth",
	AUTH_FORGOT_PASSWORD = "/auth/forgot-password",
}

export enum ApiPath {
	CALLBACK_OPENID = "/auth/callbacks/openid",
	CALLBACK_PASSWORD_RESET = "/auth/callbacks/password-reset",
}

export enum AuthMethod {
	EMAIL_SIGNIN = "EMAIL_SIGNIN",
	OAUTH_SIGNIN = "OAUTH_SIGNIN",
	PASSWORD_SIGNIN = "PASSWORD_SIGNIN",
	PHONE_SIGNIN = "PHONE_SIGNIN",
}

export enum EmailSigninType {
	OTP = "OTP",
	MAGIC_LINK = "MAGIC_LINK",
}

export enum PhoneSigninType {
	SMS = "SMS",
	WHATSAPP = "WHATSAPP",
}
