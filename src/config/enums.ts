export enum PagePath {
	ROOT = "/",
	AUTH = "/auth",
	AUTH_FORGOT_PASSWORD = "/auth/forgot-password",
}

export enum ApiPath {
	CALLBACK_OPENID = "/auth/callbacks/openid",
	CALLBACK_PASSWORD_RESET = "/auth/callbacks/password-reset",
}

export enum EmailSigninType {
	OTP = "OTP",
	MAGIC_LINK = "MAGIC_LINK",
}

export enum PhoneSigninType {
	SMS = "SMS",
	WHATSAPP = "WHATSAPP",
}
