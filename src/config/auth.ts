export const AUTH_METHOD_PASSWORD_SIGNIN = "PASSWORD_SIGNIN";
export const AUTH_METHOD_EMAIL_SIGNIN = "EMAIL_SIGNIN";
export const AUTH_METHOD_OAUTH_SIGNIN = "OAUTH_SIGNIN";

const enabledAuthMethods = new Set<
	typeof AUTH_METHOD_EMAIL_SIGNIN | typeof AUTH_METHOD_PASSWORD_SIGNIN | typeof AUTH_METHOD_OAUTH_SIGNIN
>([AUTH_METHOD_EMAIL_SIGNIN, AUTH_METHOD_OAUTH_SIGNIN, AUTH_METHOD_PASSWORD_SIGNIN]);

/**
 * Retrieves a set of the enabled signing methods.
 *
 * @returns A set of enabled signin methods.
 */
export function getEnabledAuthMethods(): typeof enabledAuthMethods {
	return enabledAuthMethods;
}
